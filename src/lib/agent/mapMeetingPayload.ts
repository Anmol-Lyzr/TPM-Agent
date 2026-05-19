import type {
  AgentMainSections,
  JiraIssueRow,
  MeetingMinutes,
  ProjectPlanRow,
  RaidLogRow,
  RaidStatus,
} from "@/types/tpm";
import type {
  BugTrackerEntry,
  JiraIssuePayload,
  MeetingActionItem,
  MeetingAttendee,
  MeetingDecision,
  MeetingMinutesPayload,
  ProjectPlanMilestone,
  ProjectPlanTask,
  RaidAssumption,
  RaidDependency,
  RaidIssue,
  RaidLogPayload,
  RaidRisk,
} from "@/types/meetingPayload";

import { normalizePlanDuration } from "@/lib/projectPlan";
import { formatRaidLogMarkdown } from "@/lib/raidLog";

import type { StructuredParseResult } from "./structuredTypes";

function joinList(items: string[]): string {
  return items.filter(Boolean).join(", ");
}

function formatAttendee(a: MeetingAttendee): string {
  const parts = [a.name];
  if (a.role) parts.push(a.role);
  if (a.organization) parts.push(a.organization);
  return parts.join(" — ");
}

function formatActionItem(item: MeetingActionItem): string {
  const owners = joinList(item.owner);
  const parts = [item.title];
  if (item.description && item.description !== item.title) {
    parts.push(item.description);
  }
  if (owners) parts.push(`Owner: ${owners}`);
  if (item.due_date) parts.push(`Due: ${item.due_date}`);
  if (item.priority) parts.push(`Priority: ${item.priority}`);
  if (item.status) parts.push(`Status: ${item.status}`);
  return parts.join(" — ");
}

function formatDecision(d: MeetingDecision): string {
  const makers = joinList(d.made_by);
  return makers ? `${d.decision} (${makers})` : d.decision;
}

function mapRaidStatus(
  status: string,
  category: "risk" | "assumption" | "issue" | "dependency"
): RaidStatus {
  const s = status.trim().toLowerCase();
  if (s === "closed" || s === "completed" || s === "resolved" || s === "invalid") {
    return "Closed";
  }
  if (
    s === "mitigated" ||
    s === "validated" ||
    s === "in remediation" ||
    s === "active" ||
    s === "in progress" ||
    s === "waiting"
  ) {
    return "Mitigating";
  }
  if (category === "assumption" && s === "open") return "Open";
  return "Open";
}

function mapJiraIssue(row: JiraIssuePayload): JiraIssueRow {
  return {
    key: row.issue_key,
    summary: row.summary,
    action: "unknown",
    status: row.status,
    issueType: row.issue_type,
    assignee: row.assignee || undefined,
    dueDate: row.due_date || undefined,
    priority: row.priority,
  };
}

function mapBugToIssue(bug: BugTrackerEntry): JiraIssueRow {
  return {
    key: bug.bug_id,
    summary: bug.summary,
    action: "unknown",
    status: bug.status,
    issueType: "Bug",
    assignee: bug.assignee || undefined,
    dueDate: bug.date_opened || undefined,
    priority: bug.severity,
  };
}

function mapMilestoneRow(m: ProjectPlanMilestone): ProjectPlanRow {
  return {
    wbsId: m.milestone_id,
    taskName: m.title,
    taskDesc: m.title,
    start: m.start_date,
    end: m.end_date,
    duration: normalizePlanDuration("", m.start_date, m.end_date),
    owner: m.owner,
    dependency: joinList(m.dependencies),
    status: m.status,
    comments: "",
    isMilestone: true,
    milestoneTitle: m.title,
  };
}

function mapTaskRow(task: ProjectPlanTask, milestoneId: string): ProjectPlanRow {
  return {
    wbsId: task.task_id,
    taskName: task.title,
    taskDesc: task.description || task.title,
    start: task.start_date,
    end: task.end_date,
    duration: normalizePlanDuration(
      String(task.duration_days ?? ""),
      task.start_date,
      task.end_date
    ),
    owner: task.owner,
    dependency: joinList(task.dependency_ids) || milestoneId,
    status: task.status,
    comments: task.comments,
  };
}

function mapProjectPlan(payload: MeetingMinutesPayload): ProjectPlanRow[] {
  const rows: ProjectPlanRow[] = [];
  for (const milestone of payload.project_plan.milestones) {
    rows.push(mapMilestoneRow(milestone));
    for (const task of milestone.tasks) {
      rows.push(mapTaskRow(task, milestone.milestone_id));
    }
  }
  return rows;
}

function mapRaidRisk(r: RaidRisk): RaidLogRow {
  return {
    id: r.risk_id,
    category: "Risk",
    description: r.description,
    owner: r.owner,
    impact: r.impact,
    probability: r.probability,
    status: mapRaidStatus(r.status, "risk"),
    mitigation: r.mitigation_strategy,
    targetDate: r.identified_date,
    notes: [r.contingency_plan, r.category ? `Category: ${r.category}` : ""]
      .filter(Boolean)
      .join(" | "),
  };
}

function mapRaidAssumption(a: RaidAssumption): RaidLogRow {
  return {
    id: a.assumption_id,
    category: "Assumption",
    description: a.description,
    owner: a.owner,
    impact: a.impact_if_invalid,
    probability: "",
    status: mapRaidStatus(a.status, "assumption"),
    mitigation: a.validation_approach,
    targetDate: a.identified_date,
    notes: "",
  };
}

function mapRaidIssue(i: RaidIssue): RaidLogRow {
  return {
    id: i.issue_id,
    category: "Issue",
    description: i.description,
    owner: i.owner,
    impact: i.impact,
    probability: "",
    status: mapRaidStatus(i.status, "issue"),
    mitigation: i.resolution_path,
    targetDate: i.identified_date,
    notes: i.category ? `Category: ${i.category}` : "",
  };
}

function mapRaidDependency(d: RaidDependency): RaidLogRow {
  return {
    id: d.dependency_id,
    category: "Dependency",
    description: d.description,
    owner: d.owner,
    impact: d.impact_if_delayed,
    probability: "",
    status: mapRaidStatus(d.status, "dependency"),
    mitigation: d.provider ? `Provider: ${d.provider}` : "",
    targetDate:
      d.expected_resolution_date === "Unknown"
        ? ""
        : d.expected_resolution_date,
    notes: [d.type, joinList(d.dependent_tasks)].filter(Boolean).join(" | "),
  };
}

function mapRaidLog(raid: RaidLogPayload): RaidLogRow[] {
  return [
    ...raid.risks.map(mapRaidRisk),
    ...raid.assumptions.map(mapRaidAssumption),
    ...raid.issues.map(mapRaidIssue),
    ...raid.dependencies.map(mapRaidDependency),
  ];
}

function collectDiscussionRisks(payload: MeetingMinutesPayload): string[] {
  const risks: string[] = [];
  for (const topic of payload.discussion_topics) {
    risks.push(...topic.details.risks);
  }
  return risks;
}

function collectDiscussionDecisions(payload: MeetingMinutesPayload): string[] {
  const fromTopics: string[] = [];
  for (const topic of payload.discussion_topics) {
    fromTopics.push(...topic.details.decisions);
  }
  return fromTopics;
}

function buildMeetingSummary(payload: MeetingMinutesPayload): string {
  const parts: string[] = [];
  const pc = payload.product_context;
  if (pc.description) parts.push(pc.description);
  for (const topic of payload.discussion_topics) {
    if (topic.summary) parts.push(`${topic.title}: ${topic.summary}`);
  }
  return parts.join("\n\n").trim();
}

function buildConfluenceMarkdown(payload: MeetingMinutesPayload): string {
  const meta = payload.meeting_metadata;
  const lines: string[] = [
    `# ${meta.meeting_title}`,
    "",
    `**Date:** ${meta.date}`,
    `**Sprint:** ${meta.sprint}`,
    `**Duration:** ${meta.duration_minutes} minutes`,
    `**Platform:** ${meta.platform}`,
    "",
    "## Attendees",
    ...payload.attendees.map((a) => `- ${formatAttendee(a)}`),
    "",
    "## Product context",
    `**${payload.product_context.product_name}**`,
    payload.product_context.description,
    "",
  ];

  if (payload.product_context.core_capabilities.length) {
    lines.push("### Core capabilities", "");
    for (const c of payload.product_context.core_capabilities) {
      lines.push(`- ${c}`);
    }
    lines.push("");
  }

  if (payload.discussion_topics.length) {
    lines.push("## Discussion topics", "");
    for (const topic of payload.discussion_topics) {
      lines.push(`### ${topic.title}`, topic.summary, "");
      if (topic.details.key_points.length) {
        lines.push("**Key points**", "");
        for (const p of topic.details.key_points) lines.push(`- ${p}`);
        lines.push("");
      }
    }
  }

  if (payload.decisions.length) {
    lines.push("## Decisions", "");
    for (const d of payload.decisions) {
      lines.push(`- ${formatDecision(d)}`);
    }
    lines.push("");
  }

  if (payload.action_items.length) {
    lines.push("## Action items", "");
    for (const item of payload.action_items) {
      lines.push(`- ${formatActionItem(item)}`);
    }
    lines.push("");
  }

  const risks = collectDiscussionRisks(payload);
  if (risks.length) {
    lines.push("## Risks", "");
    for (const r of risks) lines.push(`- ${r}`);
    lines.push("");
  }

  return lines.join("\n").trim();
}

function buildJiraMarkdown(
  jiraIssues: JiraIssuePayload[],
  bugs: BugTrackerEntry[]
): string {
  const rows = [
    ...jiraIssues.map((i) => ({
      type: i.issue_type,
      key: i.issue_key,
      summary: i.summary,
      status: i.status,
      assignee: i.assignee,
    })),
    ...bugs.map((b) => ({
      type: "Bug",
      key: b.bug_id,
      summary: b.summary,
      status: b.status,
      assignee: b.assignee,
    })),
  ];
  if (!rows.length) return "";

  const header =
    "| Issue Type | Key | Summary | Status | Assigned To |\n| --- | --- | --- | --- | --- |";
  const body = rows
    .map(
      (r) =>
        `| ${r.type} | ${r.key} | ${r.summary.replace(/\|/g, "\\|")} | ${r.status} | ${r.assignee} |`
    )
    .join("\n");
  return `${header}\n${body}`;
}

function buildSmartsheetMarkdown(plan: ProjectPlanRow[]): string {
  if (!plan.length) return "";
  const header =
    "| WBS ID | Task Name | Task Description | Start Date | End Date | Duration (Days) | Owner | Status |\n| --- | --- | --- | --- | --- | --- | --- | --- |";
  const body = plan
    .map((r) => {
      const name = r.isMilestone
        ? `**Milestone: ${r.milestoneTitle ?? r.taskName}**`
        : (r.taskName ?? "");
      return `| ${r.wbsId ?? ""} | ${name} | ${r.taskDesc} | ${r.start} | ${r.end} | ${r.duration} | ${r.owner} | ${r.status ?? ""} |`;
    })
    .join("\n");
  return `${header}\n${body}`;
}

function mapMeetingMinutes(payload: MeetingMinutesPayload): MeetingMinutes {
  const topicDecisions = collectDiscussionDecisions(payload);
  const structuredDecisions = payload.decisions.map(formatDecision);
  const openAssumptions = payload.raid_log.assumptions
    .filter((a) => a.status === "Open")
    .map((a) => a.description);

  return {
    title: payload.meeting_metadata.meeting_title,
    date: payload.meeting_metadata.date,
    attendees: payload.attendees.map(formatAttendee),
    summary: buildMeetingSummary(payload),
    decisions: [...structuredDecisions, ...topicDecisions],
    actionItems: payload.action_items.map(formatActionItem),
    risks: collectDiscussionRisks(payload),
    openQuestions: openAssumptions,
    rawBody: buildConfluenceMarkdown(payload),
  };
}

function buildExtra(
  payload: MeetingMinutesPayload
): Record<string, unknown> {
  return {
    product_context: payload.product_context,
    discussion_topics: payload.discussion_topics,
    sprint_priorities: payload.sprint_priorities,
    meeting_metadata: payload.meeting_metadata,
    metadata: payload.metadata,
    project_plan_assumptions: payload.project_plan.assumptions,
    bug_tracker: payload.bug_tracker,
  };
}

/** Map Meeting Minutes JSON schema → dashboard parse result. */
export function mapMeetingMinutesPayload(
  payload: MeetingMinutesPayload
): StructuredParseResult {
  const projectPlan = mapProjectPlan(payload);
  const raidLog = mapRaidLog(payload.raid_log);
  const issues = [
    ...payload.jira_issues.map(mapJiraIssue),
    ...payload.bug_tracker.map(mapBugToIssue),
  ];
  const meetingMinutes = mapMeetingMinutes(payload);

  const sections: AgentMainSections = {
    confluence: buildConfluenceMarkdown(payload),
    jira: buildJiraMarkdown(payload.jira_issues, payload.bug_tracker),
    smartsheet: buildSmartsheetMarkdown(projectPlan),
    raid: formatRaidLogMarkdown(raidLog),
  };

  return {
    issues,
    projectPlan,
    raidLog,
    meetingMinutes,
    sections,
    confluenceLink: null,
    extensions: {},
    extra: buildExtra(payload),
  };
}
