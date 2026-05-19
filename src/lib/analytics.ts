import type { MeetingMinutesPayload } from "@/types/meetingPayload";

export interface DashboardAnalytics {
  overallProjects: number;
  completedProjects: number;
  totalBugs: number;
  totalSessions: number;
}

export type SessionAnalyticsInput = {
  payload?: MeetingMinutesPayload | null;
};

export function sessionHasOutput(payload?: MeetingMinutesPayload | null): boolean {
  if (!payload) return false;
  return (
    (payload.project_plan?.milestones?.length ?? 0) > 0 ||
    (payload.issue_tracker?.length ?? 0) > 0 ||
    (payload.raid_log?.risks?.length ?? 0) > 0 ||
    Boolean(payload.minutes_of_meeting?.purpose?.trim())
  );
}

export function isBugIssue(issueType: string): boolean {
  return /bug|defect/i.test(issueType);
}

export function countDistinctBugKeys(sessions: SessionAnalyticsInput[]): number {
  const bugKeys = new Set<string>();
  for (const { payload } of sessions) {
    for (const issue of payload?.issue_tracker ?? []) {
      if (isBugIssue(issue.issue_type) && issue.issue_key) {
        bugKeys.add(issue.issue_key);
      }
    }
  }
  return bugKeys.size;
}

export function computeDashboardAnalytics(sessions: SessionAnalyticsInput[]): DashboardAnalytics {
  const totalSessions = sessions.length;
  const sessionsWithOutput = sessions.filter(s => sessionHasOutput(s.payload)).length;

  return {
    overallProjects: sessionsWithOutput,
    completedProjects: sessionsWithOutput,
    totalBugs: countDistinctBugKeys(sessions),
    totalSessions,
  };
}
