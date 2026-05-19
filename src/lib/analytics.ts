import type { JiraIssueRow, ParsedAgentResponse } from "@/types/tpm";

export interface DashboardAnalytics {
  overallProjects: number;
  completedProjects: number;
  totalBugs: number;
  totalSessions: number;
}

export type SessionAnalyticsInput = {
  parsed?: ParsedAgentResponse;
};

export function sessionHasOutput(parsed?: ParsedAgentResponse): boolean {
  if (!parsed) return false;
  return (
    (parsed.projectPlan?.length ?? 0) > 0 ||
    (parsed.issues?.length ?? 0) > 0 ||
    (parsed.raidLog?.length ?? 0) > 0 ||
    Boolean(parsed.meetingMinutes?.rawBody?.trim()) ||
    Boolean(parsed.meetingMinutes?.title?.trim())
  );
}

export function isBugIssue(issue: JiraIssueRow): boolean {
  const type = issue.issueType?.trim();
  if (!type) return false;
  return /bug/i.test(type);
}

export function countDistinctBugKeys(
  sessions: SessionAnalyticsInput[]
): number {
  const bugKeys = new Set<string>();
  for (const { parsed } of sessions) {
    for (const issue of parsed?.issues ?? []) {
      if (isBugIssue(issue) && issue.key) {
        bugKeys.add(issue.key);
      }
    }
  }
  return bugKeys.size;
}

export function computeDashboardAnalytics(
  sessions: SessionAnalyticsInput[]
): DashboardAnalytics {
  const totalSessions = sessions.length;
  const sessionsWithOutput = sessions.filter((s) =>
    sessionHasOutput(s.parsed)
  ).length;

  return {
    overallProjects: sessionsWithOutput,
    completedProjects: sessionsWithOutput,
    totalBugs: countDistinctBugKeys(sessions),
    totalSessions,
  };
}
