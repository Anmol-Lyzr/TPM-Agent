import type { MeetingMinutesPayload } from "@/types/meetingPayload";

export interface DashboardAnalytics {
  overallProjects: number;
  completedProjects: number;
  totalBugs: number;
  totalSessions: number;
}

export type SessionAnalyticsInput = {
  sessionId?: string;
  projectName?: string;
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

export function countBugIssues(sessions: SessionAnalyticsInput[]): number {
  let total = 0;
  for (const { payload } of sessions) {
    for (const issue of payload?.issue_tracker ?? []) {
      if (isBugIssue(issue.issue_type)) total += 1;
    }
  }
  return total;
}

function normalizeProjectName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function sanitizeExplicitProjectName(value?: string): string {
  const normalized = normalizeProjectName(value ?? "");
  if (normalized === "untitled project") return "";
  return normalized;
}

export function countDistinctProjects(sessions: SessionAnalyticsInput[]): number {
  const projectNames = new Set<string>();
  for (const { sessionId, projectName, payload } of sessions) {
    if (!sessionHasOutput(payload)) continue;
    const explicitProjectName = sanitizeExplicitProjectName(projectName);
    if (explicitProjectName) {
      projectNames.add(explicitProjectName);
      continue;
    }
    const title = payload?.metadata?.meeting_title?.trim();
    if (title) {
      projectNames.add(normalizeProjectName(title));
      continue;
    }
    if (sessionId) {
      projectNames.add(`session:${sessionId}`);
    }
  }
  return projectNames.size;
}

export function computeDashboardAnalytics(sessions: SessionAnalyticsInput[]): DashboardAnalytics {
  const totalSessions = sessions.length;
  const totalProjects = countDistinctProjects(sessions);

  return {
    overallProjects: totalProjects,
    completedProjects: totalProjects,
    totalBugs: countBugIssues(sessions),
    totalSessions,
  };
}

export interface RunAnalytics {
  planTasksTotal: number;
  planTasksDone: number;
  planTasksBlocked: number;
  openIssues: number;
  totalIssues: number;
  bugIssues: number;
  openRaidItems: number;
  totalRaidItems: number;
  openActionItems: number;
  totalActionItems: number;
  pendingCtas: number;
  totalCtas: number;
  keyDecisions: number;
}

const CLOSED_ISSUE_STATUSES = new Set(["Done", "Closed", "Resolved"]);

function isOpenIssueStatus(status: string): boolean {
  return !CLOSED_ISSUE_STATUSES.has(status);
}

function isOpenRaidRiskStatus(status: string): boolean {
  return status === "Open";
}

function isOpenRaidIssueStatus(status: string): boolean {
  return status === "Open" || status === "In Remediation";
}

function isOpenRaidDependencyStatus(status: string): boolean {
  return status !== "Completed";
}

function isOpenActionItemStatus(status: string): boolean {
  return status === "Open" || status === "In Progress" || status === "Blocked";
}

export function computeRunAnalytics(payload?: MeetingMinutesPayload | null): RunAnalytics {
  const empty: RunAnalytics = {
    planTasksTotal: 0,
    planTasksDone: 0,
    planTasksBlocked: 0,
    openIssues: 0,
    totalIssues: 0,
    bugIssues: 0,
    openRaidItems: 0,
    totalRaidItems: 0,
    openActionItems: 0,
    totalActionItems: 0,
    pendingCtas: 0,
    totalCtas: 0,
    keyDecisions: 0,
  };
  if (!payload) return empty;

  let planTasksTotal = 0;
  let planTasksDone = 0;
  let planTasksBlocked = 0;
  for (const milestone of payload.project_plan?.milestones ?? []) {
    for (const task of milestone.tasks ?? []) {
      planTasksTotal += 1;
      if (task.status === "Done") planTasksDone += 1;
      if (task.status === "Blocked") planTasksBlocked += 1;
    }
  }

  const issues = payload.issue_tracker ?? [];
  let openIssues = 0;
  let bugIssues = 0;
  for (const issue of issues) {
    if (isOpenIssueStatus(issue.status)) openIssues += 1;
    if (isBugIssue(issue.issue_type)) bugIssues += 1;
  }

  const raid = payload.raid_log;
  const risks = raid?.risks ?? [];
  const raidIssues = raid?.issues ?? [];
  const dependencies = raid?.dependencies ?? [];
  const assumptions = raid?.assumptions ?? [];
  const openRaidItems =
    risks.filter((r) => isOpenRaidRiskStatus(r.status)).length +
    raidIssues.filter((i) => isOpenRaidIssueStatus(i.status)).length +
    dependencies.filter((d) => isOpenRaidDependencyStatus(d.status)).length +
    assumptions.filter((a) => a.status === "Open").length;
  const totalRaidItems = risks.length + raidIssues.length + dependencies.length + assumptions.length;

  const actionItems = payload.minutes_of_meeting?.action_items ?? [];
  const openActionItems = actionItems.filter((a) => isOpenActionItemStatus(a.status)).length;

  const ctas = payload.call_to_actions ?? [];
  const pendingCtas = ctas.filter((c) => (c.status ?? "Pending") === "Pending").length;

  return {
    planTasksTotal,
    planTasksDone,
    planTasksBlocked,
    openIssues,
    totalIssues: issues.length,
    bugIssues,
    openRaidItems,
    totalRaidItems,
    openActionItems,
    totalActionItems: actionItems.length,
    pendingCtas,
    totalCtas: ctas.length,
    keyDecisions: payload.minutes_of_meeting?.key_decisions?.length ?? 0,
  };
}
