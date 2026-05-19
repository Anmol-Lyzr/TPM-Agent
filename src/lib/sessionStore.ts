import type { DashboardAnalytics } from "@/lib/analytics";
import { coerceParsed } from "@/lib/coerceParsed";
import type { ParsedAgentResponse } from "@/types/tpm";

function toIso(value?: string | Date): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value.toISOString();
}

export interface SessionData {
  parsed: ParsedAgentResponse;
  transcript?: string;
  rawReply?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SessionListItem {
  sessionId: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  hasTranscript: boolean;
  planCount: number;
  issuesCount: number;
  raidCount: number;
}

export async function fetchDashboardAnalytics(): Promise<DashboardAnalytics> {
  const res = await fetch("/api/analytics");
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? `Failed to load analytics (${res.status})`);
  }
  const data = (await res.json()) as DashboardAnalytics;
  return {
    overallProjects: data.overallProjects ?? 0,
    completedProjects: data.completedProjects ?? 0,
    totalBugs: data.totalBugs ?? 0,
    totalSessions: data.totalSessions ?? 0,
  };
}

export async function fetchSessionList(): Promise<SessionListItem[]> {
  const res = await fetch("/api/sessions");
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? `Failed to list sessions (${res.status})`);
  }
  const data = (await res.json()) as { sessions: SessionListItem[] };
  return (data.sessions ?? []).map((s) => ({
    ...s,
    raidCount:
      typeof s.raidCount === "number"
        ? s.raidCount
        : Number((s as { tasksCount?: number }).tasksCount) || 0,
    createdAt: toIso(s.createdAt as string | Date | undefined),
    updatedAt: toIso(s.updatedAt as string | Date | undefined),
  }));
}

export async function fetchSession(
  sessionId: string,
  options?: { includeRaw?: boolean }
): Promise<SessionData | null> {
  const params = new URLSearchParams();
  if (options?.includeRaw) params.set("includeRaw", "1");
  const qs = params.toString();
  const res = await fetch(
    `/api/sessions/${encodeURIComponent(sessionId)}${qs ? `?${qs}` : ""}`
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? `Failed to load session (${res.status})`);
  }
  const data = (await res.json()) as SessionData & {
    sessionId: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
  };
  return {
    parsed: coerceParsed(data.parsed),
    transcript: data.transcript,
    rawReply: data.rawReply,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export async function saveSession(
  sessionId: string,
  data: SessionData
): Promise<void> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? `Failed to save session (${res.status})`);
  }
}

export async function removeSession(sessionId: string): Promise<void> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? `Failed to delete session (${res.status})`);
  }
}
