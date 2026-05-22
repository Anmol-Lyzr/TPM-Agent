import type { MeetingMinutesPayload } from "@/types/meetingPayload";

export interface AtlassianSyncSummary {
  ok: boolean;
  configured: boolean;
  skipped: boolean;
  errors: string[];
  jira?: { updated: string[]; failed: Array<{ issueKey: string; error: string }> };
  confluence?: { pageId?: string; action?: string; error?: string };
}

export interface SessionData {
  payload: MeetingMinutesPayload | null;
  projectName?: string;
  transcript?: string;
  confluencePageId?: string;
  createdAt?: string;
  updatedAt?: string;
  atlassian_sync?: AtlassianSyncSummary;
}

export interface SessionListItem {
  sessionId: string;
  projectName?: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  hasTranscript: boolean;
  planCount: number;
  issuesCount: number;
  raidCount: number;
}

function toIso(value?: string | Date): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value.toISOString();
}

export async function fetchDashboardAnalytics() {
  const res = await fetch("/api/analytics");
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? `Failed to load analytics (${res.status})`);
  }
  return (await res.json()) as { overallProjects: number; completedProjects: number; totalBugs: number; totalSessions: number };
}

export async function fetchSessionList(): Promise<SessionListItem[]> {
  const res = await fetch("/api/sessions");
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? `Failed to list sessions (${res.status})`);
  }
  const data = (await res.json()) as { sessions: SessionListItem[] };
  return (data.sessions ?? []).map(s => ({
    ...s,
    createdAt: toIso(s.createdAt as string | Date | undefined),
    updatedAt: toIso(s.updatedAt as string | Date | undefined),
  }));
}

export async function fetchSession(sessionId: string): Promise<SessionData | null> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? `Failed to load session (${res.status})`);
  }
  const data = (await res.json()) as SessionData & { sessionId: string; createdAt?: string | Date; updatedAt?: string | Date };
  return {
    payload: data.payload ?? null,
    projectName: data.projectName,
    transcript: data.transcript,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export type SaveSessionOptions = {
  /** Only sync these Jira keys to Atlassian (Issue Tracker row edits). */
  syncIssueKeys?: string[];
  /** Persist Mongo only — used after CTA already ran jira_actions. */
  skipAtlassianSync?: boolean;
};

export async function saveSession(
  sessionId: string,
  data: SessionData,
  options?: SaveSessionOptions
): Promise<SessionData & { sessionId: string }> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      syncIssueKeys: options?.syncIssueKeys,
      skipAtlassianSync: options?.skipAtlassianSync,
    }),
  });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? `Failed to save session (${res.status})`);
  }
  return (await res.json()) as SessionData & { sessionId: string };
}

export async function removeSession(sessionId: string): Promise<void> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? `Failed to delete session (${res.status})`);
  }
}
