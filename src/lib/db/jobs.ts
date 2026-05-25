import { getDb } from "@/lib/db/mongodb";
import { randomUUID } from "crypto";
import type { MeetingMinutesPayload } from "@/types/meetingPayload";

const COLLECTION = "agent_jobs";
let indexesEnsured = false;

export type JobStatus = "pending" | "processing" | "completed" | "failed";
export type AgentJobStage =
  | "queued"
  | "calling_lyzr"
  | "parsing_agent_response"
  | "saving_session"
  | "syncing_atlassian"
  | "completed"
  | "failed";

export interface AgentJobDocument {
  jobId: string;
  status: JobStatus;
  stage: AgentJobStage;
  mode: "analyze" | "refine";
  sessionId: string;
  message: string;
  transcript?: string;
  projectName?: string;
  feedbackText?: string;
  currentPayload?: MeetingMinutesPayload | null;
  // result fields (populated on completion)
  resultSessionId?: string;
  resultPayload?: MeetingMinutesPayload | null;
  persisted?: boolean;
  persistError?: string;
  atlassianSync?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJobInput {
  mode: "analyze" | "refine";
  sessionId: string;
  message: string;
  transcript?: string;
  projectName?: string;
  feedbackText?: string;
  currentPayload?: MeetingMinutesPayload | null;
}

async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const db = await getDb();
  await db.collection(COLLECTION).createIndex({ jobId: 1 }, { unique: true });
  // TTL index: auto-delete jobs after 24 hours
  await db.collection(COLLECTION).createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });
  indexesEnsured = true;
}

export async function createJob(input: CreateJobInput): Promise<AgentJobDocument> {
  await ensureIndexes();
  const db = await getDb();
  const now = new Date();
  const doc: AgentJobDocument = {
    jobId: randomUUID(),
    status: "pending",
    stage: "queued",
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<AgentJobDocument>(COLLECTION).insertOne(doc);
  return doc;
}

export async function updateJobStatus(
  jobId: string,
  update: Partial<Pick<
    AgentJobDocument,
    "status" | "stage" | "resultSessionId" | "resultPayload" | "persisted" | "persistError" | "atlassianSync" | "error"
  >>
): Promise<void> {
  const db = await getDb();
  await db.collection<AgentJobDocument>(COLLECTION).updateOne(
    { jobId },
    { $set: { ...update, updatedAt: new Date() } }
  );
}

export async function getJob(jobId: string): Promise<AgentJobDocument | null> {
  await ensureIndexes();
  const db = await getDb();
  return db.collection<AgentJobDocument>(COLLECTION).findOne({ jobId });
}
