import { projectPlanToTasks } from "@/lib/parseAgentResponse";
import type {
  DashboardTabId,
  JiraIssueRow,
  MeetingMinutes,
  ParsedAgentResponse,
  ProjectPlanRow,
  TaskRow,
} from "@/types/tpm";

export function cloneParsed(parsed: ParsedAgentResponse): ParsedAgentResponse {
  return JSON.parse(JSON.stringify(parsed)) as ParsedAgentResponse;
}

export function applyProjectPlanSave(
  parsed: ParsedAgentResponse,
  rows: ProjectPlanRow[]
): ParsedAgentResponse {
  const next = cloneParsed(parsed);
  next.projectPlan = rows.map((r) => ({ ...r }));
  next.tasks = projectPlanToTasks(next.projectPlan);
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

export function applyTasksSave(
  parsed: ParsedAgentResponse,
  tasks: TaskRow[]
): ParsedAgentResponse {
  const next = cloneParsed(parsed);
  next.tasks = tasks.map((t) => ({ ...t }));

  next.projectPlan = next.projectPlan.map((row) => {
    const num = row.taskNumber;
    if (!num) return row;
    const task = next.tasks.find((t) => t.taskNumber === num);
    if (!task) return row;
    const prefix = `${num} `;
    return {
      ...row,
      taskDesc: task.description.startsWith(`${num} `)
        ? task.description
        : `${prefix}${task.description}`,
      owner: task.owner,
      start: task.start,
      end: task.end,
      dependency: task.dependency,
      duration: row.duration,
      comments: row.comments,
    };
  });

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
    case "tasks":
      return parsed.tasks;
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
  { key: "tasks", label: "Task Tracker" },
  { key: "mom", label: "Minutes of Meeting" },
];
