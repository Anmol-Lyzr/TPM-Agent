import type {
  DashboardTabId,
  JiraIssueRow,
  MeetingMinutes,
  ParsedAgentResponse,
  ProjectPlanRow,
  RaidLogRow,
} from "@/types/tpm";
import { ensureRaidLogIds } from "@/lib/raidLog";

export function cloneParsed(parsed: ParsedAgentResponse): ParsedAgentResponse {
  return JSON.parse(JSON.stringify(parsed)) as ParsedAgentResponse;
}

export function applyProjectPlanSave(
  parsed: ParsedAgentResponse,
  rows: ProjectPlanRow[]
): ParsedAgentResponse {
  const next = cloneParsed(parsed);
  next.projectPlan = rows.map((r) => ({ ...r }));
  return next;
}

export function applyIssuesSave(
  parsed: ParsedAgentResponse,
  issues: JiraIssueRow[]
): ParsedAgentResponse {
  const next = cloneParsed(parsed);
  next.issues = issues.map((i) => ({ ...i }));
  return next;
}

/** RAID log saves are isolated — no sync to project plan or Jira. */
export function applyRaidLogSave(
  parsed: ParsedAgentResponse,
  raidLog: RaidLogRow[]
): ParsedAgentResponse {
  const next = cloneParsed(parsed);
  next.raidLog = ensureRaidLogIds(raidLog.map((r) => ({ ...r })));
  return next;
}

export function applyMomSave(
  parsed: ParsedAgentResponse,
  minutes: MeetingMinutes
): ParsedAgentResponse {
  const next = cloneParsed(parsed);
  next.meetingMinutes = {
    ...minutes,
    attendees: [...minutes.attendees],
    decisions: [...minutes.decisions],
    actionItems: [...minutes.actionItems],
    risks: [...minutes.risks],
    openQuestions: [...minutes.openQuestions],
  };
  return next;
}

export function getTabSnapshot(
  parsed: ParsedAgentResponse,
  tab: DashboardTabId
): unknown {
  switch (tab) {
    case "plan":
      return parsed.projectPlan;
    case "issues":
      return parsed.issues;
    case "raid":
      return parsed.raidLog;
    case "mom":
      return parsed.meetingMinutes;
  }
}

/** Deep-clone a single tab slice (avoids cloning full parsed on edit). */
export function cloneTabSnapshot<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

export const DASHBOARD_TABS: { key: DashboardTabId; label: string }[] = [
  { key: "plan", label: "Project Plan" },
  { key: "issues", label: "Issue Tracker" },
  { key: "raid", label: "RAID Log" },
  { key: "mom", label: "Minutes of Meeting" },
];
