import { getDb, resetMongoClient } from "@/lib/db/mongodb";
import { sanitizeForMongo } from "@/lib/db/sanitize";
import type { MeetingMinutesPayload } from "@/types/meetingPayload";

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
  payload: MeetingMinutesPayload | null;
  transcript?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionUpsertInput {
  payload: MeetingMinutesPayload | null;
  transcript?: string;
}

export interface SessionSummary {
  sessionId: string;
  title: string;
  updatedAt: Date;
  createdAt: Date;
  hasTranscript: boolean;
  planCount: number;
  issuesCount: number;
  raidCount: number;
}

function deriveTitle(doc: { sessionId: string; payload?: MeetingMinutesPayload | null; transcript?: string }): string {
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
    .find({}, { projection: { sessionId: 1, createdAt: 1, updatedAt: 1, transcript: 1, payload: 1 } })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map(doc => ({
    sessionId: doc.sessionId,
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
