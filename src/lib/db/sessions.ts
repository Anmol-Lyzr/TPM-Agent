import { getDb, resetMongoClient } from "@/lib/db/mongodb";
import { sanitizeForMongo } from "@/lib/db/sanitize";
import type { CallToActionEntry, MeetingMinutesPayload } from "@/types/meetingPayload";

const COLLECTION = "sessions";
let indexesEnsured = false;

async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const db = await getDb();
  await db.collection(COLLECTION).createIndex({ sessionId: 1 }, { unique: true });
  indexesEnsured = true;
}

export interface TpmSessionDocument {
  sessionId: string;
  projectName?: string;
  payload: MeetingMinutesPayload | null;
  transcript?: string;
  /** Confluence page id returned after first MoM sync. */
  confluencePageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionUpsertInput {
  payload: MeetingMinutesPayload | null;
  transcript?: string;
  projectName?: string;
  confluencePageId?: string;
}

export interface SessionSummary {
  sessionId: string;
  projectName?: string;
  title: string;
  updatedAt: Date;
  createdAt: Date;
  hasTranscript: boolean;
  planCount: number;
  issuesCount: number;
  raidCount: number;
}

function normalizeExplicitProjectName(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.toLowerCase() === "untitled project") return undefined;
  return trimmed;
}

function deriveTitle(doc: {
  sessionId: string;
  projectName?: string;
  payload?: MeetingMinutesPayload | null;
  transcript?: string;
}): string {
  const projectName = normalizeExplicitProjectName(doc.projectName);
  if (projectName) return projectName;
  const title = doc.payload?.metadata?.meeting_title?.trim();
  if (title) return title;
  const sprint = doc.payload?.metadata?.sprint?.trim();
  if (sprint) return sprint;
  const transcript = doc.transcript?.trim();
  if (transcript) {
    const firstLine = transcript.split(/\r?\n/).find(l => l.trim())?.trim();
    if (firstLine) return firstLine.length > 72 ? `${firstLine.slice(0, 72)}…` : firstLine;
  }
  const suffix = doc.sessionId.split("-").pop() ?? doc.sessionId;
  return `Session ${suffix.slice(0, 12)}`;
}

async function upsertSessionOnce(sessionId: string, input: SessionUpsertInput): Promise<TpmSessionDocument> {
  await ensureIndexes();
  const db = await getDb();
  const now = new Date();
  const setFields: Partial<TpmSessionDocument> = {
    sessionId,
    payload: sanitizeForMongo(input.payload) as MeetingMinutesPayload | null,
    updatedAt: now,
  };
  if (input.transcript !== undefined) setFields.transcript = input.transcript;
  if (input.projectName !== undefined) setFields.projectName = normalizeExplicitProjectName(input.projectName);
  if (input.confluencePageId !== undefined) setFields.confluencePageId = input.confluencePageId;

  await db.collection<TpmSessionDocument>(COLLECTION).updateOne(
    { sessionId },
    { $set: setFields, $setOnInsert: { createdAt: now } },
    { upsert: true }
  );

  const doc = await db.collection<TpmSessionDocument>(COLLECTION).findOne({ sessionId });
  if (!doc) throw new Error(`Session ${sessionId} not found after upsert`);
  return doc;
}

export async function upsertSession(sessionId: string, input: SessionUpsertInput): Promise<TpmSessionDocument> {
  try {
    return await upsertSessionOnce(sessionId, input);
  } catch (err) {
    resetMongoClient();
    indexesEnsured = false;
    return upsertSessionOnce(sessionId, input);
  }
}

export async function getSession(sessionId: string): Promise<TpmSessionDocument | null> {
  await ensureIndexes();
  const db = await getDb();
  return db.collection<TpmSessionDocument>(COLLECTION).findOne({ sessionId });
}

export async function listSessions(limit = 200): Promise<SessionSummary[]> {
  await ensureIndexes();
  const db = await getDb();
  const docs = await db
    .collection<TpmSessionDocument>(COLLECTION)
    .find({}, { projection: { sessionId: 1, projectName: 1, createdAt: 1, updatedAt: 1, transcript: 1, payload: 1 } })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map(doc => ({
    sessionId: doc.sessionId,
    projectName: normalizeExplicitProjectName(doc.projectName),
    title: deriveTitle(doc),
    createdAt: doc.createdAt ?? new Date(0),
    updatedAt: doc.updatedAt ?? doc.createdAt ?? new Date(0),
    hasTranscript: Boolean(doc.transcript?.trim()),
    planCount: doc.payload?.project_plan?.milestones?.reduce((n, m) => n + m.tasks.length, 0) ?? 0,
    issuesCount: doc.payload?.issue_tracker?.length ?? 0,
    raidCount: (
      (doc.payload?.raid_log?.risks?.length ?? 0) +
      (doc.payload?.raid_log?.assumptions?.length ?? 0) +
      (doc.payload?.raid_log?.issues?.length ?? 0) +
      (doc.payload?.raid_log?.dependencies?.length ?? 0)
    ),
  }));
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection(COLLECTION).deleteOne({ sessionId });
  return result.deletedCount > 0;
}

export interface CtaAggregateRow {
  sessionId: string;
  projectTitle: string;
  projectKey: string;
  cta: CallToActionEntry;
}

export async function listCtaAggregates(): Promise<CtaAggregateRow[]> {
  await ensureIndexes();
  const db = await getDb();
  const docs = await db
    .collection<TpmSessionDocument>(COLLECTION)
    .find(
      { "payload.call_to_actions.0": { $exists: true } },
      {
        projection: {
          sessionId: 1,
          projectName: 1,
          transcript: 1,
          "payload.metadata": 1,
          "payload.call_to_actions": 1,
        },
      }
    )
    .sort({ updatedAt: -1 })
    .limit(500)
    .toArray();

  const rows: CtaAggregateRow[] = [];
  for (const doc of docs) {
    const projectTitle = deriveTitle(doc);
    const projectKey =
      normalizeExplicitProjectName(doc.projectName) ?? doc.sessionId;
    for (const raw of doc.payload?.call_to_actions ?? []) {
      if (!raw?.cta_id) continue;
      const cta: CallToActionEntry = {
        ...raw,
        action_when_approved: Array.isArray(raw.action_when_approved)
          ? raw.action_when_approved
          : [String(raw.action_when_approved ?? "").trim()].filter(Boolean),
        jira_actions: Array.isArray(raw.jira_actions) ? raw.jira_actions : [],
        status: raw.status ?? "Pending",
      };
      rows.push({
        sessionId: doc.sessionId,
        projectTitle,
        projectKey,
        cta,
      });
    }
  }
  return rows;
}
