import {
  computeDashboardAnalytics,
  type DashboardAnalytics,
} from "@/lib/analytics";
import { coerceParsed } from "@/lib/coerceParsed";
import { buildRaidLog, enrichParsedRaid } from "@/lib/raidLog";
import { getDb, resetMongoClient } from "@/lib/db/mongodb";
import { sanitizeForMongo } from "@/lib/db/sanitize";
import type { ParsedAgentResponse } from "@/types/tpm";

export type { DashboardAnalytics };

const COLLECTION = "sessions";

let indexesEnsured = false;

async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const db = await getDb();
  await db
    .collection(COLLECTION)
    .createIndex({ sessionId: 1 }, { unique: true });
  indexesEnsured = true;
}

export interface TpmSessionDocument {
  sessionId: string;
  parsed: ParsedAgentResponse;
  transcript?: string;
  rawReply?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionUpsertInput {
  parsed: ParsedAgentResponse;
  transcript?: string;
  rawReply?: string;
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

function deriveTitle(doc: {
  sessionId: string;
  transcript?: string;
  parsed?: ParsedAgentResponse;
}): string {
  const momTitle = doc.parsed?.meetingMinutes?.title?.trim();
  if (momTitle) return momTitle;

  const transcript = doc.transcript?.trim();
  if (transcript) {
    const firstLine = transcript.split(/\r?\n/).find((l) => l.trim())?.trim();
    if (firstLine) {
      return firstLine.length > 72 ? `${firstLine.slice(0, 72)}…` : firstLine;
    }
  }

  const suffix = doc.sessionId.split("-").pop() ?? doc.sessionId;
  return `Session ${suffix.slice(0, 12)}`;
}

export async function getSession(
  sessionId: string
): Promise<TpmSessionDocument | null> {
  await ensureIndexes();
  const db = await getDb();
  const doc = await db
    .collection<TpmSessionDocument>(COLLECTION)
    .findOne({ sessionId });
  if (!doc) return null;
  let parsed = coerceParsed(doc.parsed, {
    sourceMarkdown:
      doc.rawReply ??
      (typeof doc.parsed === "object" &&
      doc.parsed !== null &&
      "sourceMarkdown" in doc.parsed
        ? String((doc.parsed as { sourceMarkdown?: string }).sourceMarkdown ?? "")
        : ""),
    transcript: doc.transcript,
  });
  if (doc.transcript?.trim()) {
    parsed = enrichParsedRaid(parsed, doc.transcript);
  } else if (parsed.raidLog.length === 0 && parsed.sections.confluence.trim()) {
    const rebuilt = buildRaidLog(
      parsed.sections.raid,
      parsed.sections.confluence,
      parsed.meetingMinutes
    );
    if (rebuilt.length > 0) {
      parsed = { ...parsed, raidLog: rebuilt };
    }
  }
  return { ...doc, parsed };
}

async function upsertSessionOnce(
  sessionId: string,
  input: SessionUpsertInput
): Promise<TpmSessionDocument> {
  await ensureIndexes();
  const db = await getDb();
  const now = new Date();
  const parsed = sanitizeForMongo(coerceParsed(input.parsed));
  const setFields: Partial<TpmSessionDocument> = {
    sessionId,
    parsed,
    updatedAt: now,
  };
  if (input.transcript !== undefined) {
    setFields.transcript = input.transcript;
  }
  if (input.rawReply !== undefined) {
    setFields.rawReply = input.rawReply;
  }

  // updateOne + findOne avoids DocumentDB returning null from findOneAndUpdate.
  await db.collection<TpmSessionDocument>(COLLECTION).updateOne(
    { sessionId },
    {
      $set: setFields,
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  const doc = await db
    .collection<TpmSessionDocument>(COLLECTION)
    .findOne({ sessionId });

  if (!doc) {
    throw new Error(`Session ${sessionId} was not found after upsert`);
  }
  return { ...doc, parsed: coerceParsed(doc.parsed) };
}

export async function upsertSession(
  sessionId: string,
  input: SessionUpsertInput
): Promise<TpmSessionDocument> {
  try {
    return await upsertSessionOnce(sessionId, input);
  } catch (err) {
    resetMongoClient();
    indexesEnsured = false;
    return upsertSessionOnce(sessionId, input);
  }
}

export async function listSessions(limit = 200): Promise<SessionSummary[]> {
  await ensureIndexes();
  const db = await getDb();
  const docs = await db
    .collection<TpmSessionDocument>(COLLECTION)
    .find(
      {},
      {
        projection: {
          sessionId: 1,
          createdAt: 1,
          updatedAt: 1,
          transcript: 1,
          "parsed.meetingMinutes.title": 1,
          "parsed.projectPlan": 1,
          "parsed.issues": 1,
          "parsed.raidLog": 1,
        },
      }
    )
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map((doc) => ({
    sessionId: doc.sessionId,
    title: deriveTitle(doc),
    createdAt: doc.createdAt ?? new Date(0),
    updatedAt: doc.updatedAt ?? doc.createdAt ?? new Date(0),
    hasTranscript: Boolean(doc.transcript?.trim()),
    planCount: doc.parsed?.projectPlan?.length ?? 0,
    issuesCount: doc.parsed?.issues?.length ?? 0,
    raidCount: coerceParsed(doc.parsed).raidLog.length,
  }));
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .collection(COLLECTION)
    .deleteOne({ sessionId });
  return result.deletedCount > 0;
}

export async function getDashboardAnalytics(
  limit = 200
): Promise<DashboardAnalytics> {
  await ensureIndexes();
  const db = await getDb();
  const docs = await db
    .collection<TpmSessionDocument>(COLLECTION)
    .find(
      {},
      {
        projection: {
          "parsed.projectPlan": 1,
          "parsed.issues": 1,
          "parsed.raidLog": 1,
          "parsed.meetingMinutes.title": 1,
          "parsed.meetingMinutes.rawBody": 1,
        },
      }
    )
    .limit(limit)
    .toArray();

  return computeDashboardAnalytics(docs);
}
