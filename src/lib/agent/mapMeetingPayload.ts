import type {
  AgentMainSections,
  JiraIssueRow,
  MeetingMinutes,
  ProjectPlanRow,
  RaidLogRow,
} from "@/types/legacyTpm";
import type {
  IssueTrackerEntry,
  MeetingMinutesPayload,
  ProjectPlanMilestone,
  ProjectPlanTask,
  RaidAssumption,
  RaidDependency,
  RaidIssue,
  RaidLogPayload,
  RaidRisk,
} from "@/types/meetingPayload";

import { formatRaidLogMarkdown } from "@/lib/raidLog";

import type { StructuredParseResult } from "./structuredTypes";

function joinList(items: string[]): string {
  return items.filter(Boolean).join(", ");
}

function mapIssueTrackerEntry(entry: IssueTrackerEntry): JiraIssueRow {
  return {
    key: entry.issue_key,
    summary: entry.summary,
    action: "unknown",
    status: entry.status,
    issueType: entry.issue_type,
    assignee: entry.assignee || undefined,
    dueDate: entry.due_date || undefined,
    priority: entry.priority,
  };
}

function mapMilestoneRow(m: ProjectPlanMilestone): ProjectPlanRow {
  return {
    wbsId: m.milestone_id,
    taskName: m.title,
    taskDesc: m.title,
    start: m.start_date,
    end: m.end_date,
    duration: String(m.milestone_timeline_duration),
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
    duration: String(task.duration_days),
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
    status: r.status === "Mitigated" ? "Mitigating" : r.status === "Closed" ? "Closed" : "Open",
    mitigation: r.mitigation_strategy,
    targetDate: r.identified_date,
    notes: r.contingency_plan,
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
    status: a.status === "Validated" ? "Accepted" : a.status === "Invalid" ? "Closed" : "Open",
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
    status: i.status === "In Remediation" ? "Mitigating" : i.status === "Closed" ? "Closed" : "Open",
    mitigation: i.resolution_path,
    targetDate: i.identified_date,
    notes: "",
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
    status: d.status === "Completed" ? "Closed" : "Open",
    mitigation: "",
    targetDate: d.expected_resolution_date,
    notes: d.provider ? `Provider: ${d.provider}` : "",
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

function buildMeetingMinutes(payload: MeetingMinutesPayload): MeetingMinutes {
  const mom = payload.minutes_of_meeting;
  const meta = payload.metadata;
  const confluenceText = buildConfluenceText(payload);

  return {
    title: meta.meeting_title,
    date: meta.date,
    attendees: [],
    summary: [
      mom.purpose,
      ...mom.discussion_highlights.map((h) => `${h.topic}: ${h.summary}`),
    ]
      .filter(Boolean)
      .join("\n\n"),
    decisions: mom.key_decisions.map(
      (d) => `[${d.decision_id}] ${d.decision} (${d.decided_by})`
    ),
    actionItems: mom.action_items.map(
      (a) =>
        `[${a.action_id}] ${a.action} — Owner: ${a.owner}, Due: ${a.due_date}, Status: ${a.status}`
    ),
    risks: mom.risks_and_dependencies_summary,
    openQuestions: [],
    rawBody: confluenceText,
  };
}

function buildConfluenceText(payload: MeetingMinutesPayload): string {
  const meta = payload.metadata;
  const mom = payload.minutes_of_meeting;

  const lines: string[] = [
    meta.meeting_title,
    "",
    `Date: ${meta.date}`,
    `Sprint: ${meta.sprint}`,
    `Duration: ${meta.duration_minutes} minutes`,
    `Platform: ${meta.platform}`,
    "",
  ];

  if (mom.purpose) {
    lines.push("Meeting Purpose", "", mom.purpose, "");
  }

  if (mom.discussion_highlights.length) {
    lines.push("Discussion Highlights", "");
    for (const h of mom.discussion_highlights) {
      lines.push(`${h.topic}: ${h.summary}`);
      if (h.related_issue_keys.length) {
        lines.push(`  Related: ${h.related_issue_keys.join(", ")}`);
      }
    }
    lines.push("");
  }

  if (mom.key_decisions.length) {
    lines.push("Key Decisions", "");
    for (const d of mom.key_decisions) {
      lines.push(`- [${d.decision_id}] ${d.decision} (${d.decided_by})`);
    }
    lines.push("");
  }

  if (mom.action_items.length) {
    lines.push("Action Items", "");
    for (const item of mom.action_items) {
      lines.push(
        `- [${item.action_id}] ${item.action} — Owner: ${item.owner}, Due: ${item.due_date}, Status: ${item.status}`
      );
    }
    lines.push("");
  }

  if (mom.risks_and_dependencies_summary.length) {
    lines.push("Risks & Dependencies", "");
    for (const r of mom.risks_and_dependencies_summary) {
      lines.push(`- ${r}`);
    }
    lines.push("");
  }

  if (mom.next_milestones.length) {
    lines.push("Next Milestones", "");
    for (const m of mom.next_milestones) {
      lines.push(`- ${m.milestone} — ${m.target_date}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

function buildIssueMarkdown(issues: JiraIssueRow[]): string {
  if (!issues.length) return "";
  const header =
    "| Key | Type | Summary | Status | Assignee | Priority | Due |\n| --- | --- | --- | --- | --- | --- | --- |";
  const body = issues
    .map(
      (i) =>
        `| ${i.key} | ${i.issueType ?? "—"} | ${i.summary.replace(/\|/g, "\\|")} | ${i.status ?? "—"} | ${i.assignee ?? "—"} | ${i.priority ?? "—"} | ${i.dueDate ?? "—"} |`
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

function buildExtra(payload: MeetingMinutesPayload): Record<string, unknown> {
  return {
    meeting_metadata: payload.metadata,
    project_plan_assumptions: payload.project_plan.assumptions,
    project_timeline_duration: payload.project_plan.project_timeline_duration,
    next_milestones: payload.minutes_of_meeting.next_milestones,
  };
}

/** Map Meeting Minutes JSON payload → dashboard parse result. */
export function mapMeetingMinutesPayload(
  payload: MeetingMinutesPayload
): StructuredParseResult {
  const projectPlan = mapProjectPlan(payload);
  const raidLog = mapRaidLog(payload.raid_log);
  const issues = payload.issue_tracker.map(mapIssueTrackerEntry);
  const meetingMinutes = buildMeetingMinutes(payload);
  const confluenceText = buildConfluenceText(payload);

  const sections: AgentMainSections = {
    confluence: confluenceText,
    jira: buildIssueMarkdown(issues),
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
