import { z } from "zod";

// ── metadata ─────────────────────────────────────────────────────────────────

const MeetingMetadataSchema = z.object({
  meeting_title: z.string(),
  date: z.string(),
  duration_minutes: z.number(),
  sprint: z.string(),
  pilot_installation: z.object({
    name: z.string(),
    location: z.string(),
    status: z.string(),
  }),
  recording_available: z.boolean(),
  platform: z.string(),
});

// ── minutes_of_meeting ──────────────────────────────────────────────────────

const MomKeyDecisionSchema = z.object({
  decision_id: z.string(),
  decision: z.string(),
  decided_by: z.string(),
});

const MomActionItemSchema = z.object({
  action_id: z.string(),
  action: z.string(),
  owner: z.string(),
  due_date: z.string(),
  status: z.enum(["Open", "In Progress", "Done", "Blocked"]),
});

const DiscussionHighlightSchema = z.object({
  topic: z.string(),
  summary: z.string(),
  related_issue_keys: z.array(z.string()),
});

const NextMilestoneSchema = z.object({
  milestone: z.string(),
  target_date: z.string(),
});

const MinutesOfMeetingSchema = z.object({
  purpose: z.string(),
  key_decisions: z.array(MomKeyDecisionSchema),
  action_items: z.array(MomActionItemSchema),
  discussion_highlights: z.array(DiscussionHighlightSchema),
  risks_and_dependencies_summary: z.array(z.string()),
  next_milestones: z.array(NextMilestoneSchema),
});

// ── issue_tracker ─────────────────────────────────────────────────────────────

const IssueTrackerEntrySchema = z.object({
  issue_key: z.string(),
  issue_type: z.enum(["Bug", "Story", "Task", "Epic"]),
  summary: z.string(),
  description: z.string(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  status: z.enum([
    "Open",
    "To Do",
    "In Progress",
    "Done",
    "Blocked",
    "Resolved",
    "Closed",
  ]),
  assignee: z.string(),
  reporter: z.string(),
  sprint: z.string(),
  epic: z.string(),
  labels: z.array(z.string()),
  story_points: z.number(),
  blocked_by: z.array(z.string()),
  due_date: z.string(),
  acceptance_criteria: z.array(z.string()),
  severity: z.enum(["Low", "Medium", "High", "Critical"]),
  module: z.string(),
  root_cause: z.string(),
  steps_to_reproduce: z.array(z.string()),
  impact: z.string(),
  workaround: z.string(),
  resolution_plan: z.string(),
  date_opened: z.string(),
  date_resolved: z.union([z.string(), z.null()]),
});

// ── project_plan ─────────────────────────────────────────────────────────────

const ProjectPlanTaskSchema = z.object({
  task_id: z.string(),
  title: z.string(),
  description: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  duration_days: z.number(),
  owner: z.string(),
  status: z.enum(["To Do", "In Progress", "Done", "Blocked"]),
  dependency_ids: z.array(z.string()),
  comments: z.string(),
});

const ProjectPlanMilestoneSchema = z.object({
  milestone_id: z.string(),
  milestone_timeline_duration: z.number(),
  title: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  owner: z.string(),
  status: z.enum(["Not Started", "In Progress", "Completed"]),
  dependencies: z.array(z.string()),
  tasks: z.array(ProjectPlanTaskSchema),
});

const ProjectPlanPayloadSchema = z.object({
  project_timeline_duration: z.number(),
  assumptions: z.object({
    sprint_duration_weeks: z.number(),
    target_ga_date: z.string(),
  }),
  milestones: z.array(ProjectPlanMilestoneSchema),
});

// ── raid_log ─────────────────────────────────────────────────────────────────

const RaidRiskSchema = z.object({
  risk_id: z.string(),
  description: z.string(),
  category: z.string(),
  probability: z.enum(["Low", "Medium", "High"]),
  impact: z.enum(["Low", "Medium", "High"]),
  risk_level: z.enum(["Low", "Medium", "High", "Critical"]),
  owner: z.string(),
  identified_date: z.string(),
  mitigation_strategy: z.string(),
  contingency_plan: z.string(),
  status: z.enum(["Open", "Mitigated", "Closed"]),
  related_tasks: z.array(z.string()),
});

const RaidAssumptionSchema = z.object({
  assumption_id: z.string(),
  description: z.string(),
  owner: z.string(),
  identified_date: z.string(),
  impact_if_invalid: z.string(),
  validation_approach: z.string(),
  status: z.enum(["Open", "Validated", "Invalid"]),
});

const RaidIssueSchema = z.object({
  issue_id: z.string(),
  description: z.string(),
  category: z.string(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  owner: z.string(),
  identified_date: z.string(),
  impact: z.string(),
  resolution_path: z.string(),
  status: z.enum(["Open", "In Remediation", "Closed"]),
  related_tasks: z.array(z.string()),
});

const RaidDependencySchema = z.object({
  dependency_id: z.string(),
  description: z.string(),
  type: z.enum(["Internal", "External"]),
  owner: z.string(),
  provider: z.string(),
  dependent_tasks: z.array(z.string()),
  identified_date: z.string(),
  expected_resolution_date: z.string(),
  status: z.enum(["Open", "Waiting", "Active", "Completed"]),
  impact_if_delayed: z.string(),
});

const RaidLogPayloadSchema = z.object({
  risks: z.array(RaidRiskSchema),
  assumptions: z.array(RaidAssumptionSchema),
  issues: z.array(RaidIssueSchema),
  dependencies: z.array(RaidDependencySchema),
});

const JiraActionFieldsSchema = z.object({
  summary: z.string(),
  description: z.string(),
  issuetype: z.string(),
  priority: z.string(),
  assignee: z.string(),
  reporter: z.string(),
  labels: z.array(z.string()),
  duedate: z.string(),
  parent_key: z.string(),
  epic_link: z.string(),
  story_points: z.number(),
  components: z.array(z.string()),
  fix_versions: z.array(z.string()),
});

const CtaJiraActionSchema = z.object({
  operation: z.enum([
    "create_issue",
    "update_issue",
    "transition_status",
    "add_comment",
    "assign_user",
    "link_issues",
  ]),
  project_key: z.string(),
  issue_key: z.string(),
  fields: JiraActionFieldsSchema,
  transition_name: z.string(),
  comment_body: z.string(),
  link_type: z.string(),
  linked_issue_key: z.string(),
});

const CallToActionSchema = z.object({
  cta_id: z.string(),
  category: z.enum([
    "Blockers & Escalations",
    "Deadline & Schedule Alerts",
    "Accountability & Ownership",
    "Meeting & MoM Follow-ups",
    "Health & Progress Anomalies",
  ]),
  title: z.string(),
  description: z.string(),
  impact: z.string(),
  action_when_approved: z.array(z.string()),
  suggestion_prompt: z.string(),
  target_recipient: z.string(),
  target_channel: z.enum([
    "Email",
    "Slack",
    "Jira Comment",
    "Calendar Invite",
    "Confluence Page",
    "Other",
  ]),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  related_entity: z.object({
    entity_type: z.enum([
      "action_item",
      "key_decision",
      "issue",
      "risk",
      "assumption",
      "dependency",
      "milestone",
      "task",
      "none",
    ]),
    entity_id: z.string(),
  }),
  status: z.enum(["Pending", "Approved", "Executed", "Dismissed"]),
  jira_actions: z.array(CtaJiraActionSchema).default([]),
});

// ── top-level schema ──────────────────────────────────────────────────────────

export const MeetingMinutesPayloadSchema = z.object({
  metadata: MeetingMetadataSchema,
  minutes_of_meeting: MinutesOfMeetingSchema,
  issue_tracker: z.array(IssueTrackerEntrySchema),
  project_plan: ProjectPlanPayloadSchema,
  raid_log: RaidLogPayloadSchema,
  call_to_actions: z.array(CallToActionSchema).optional(),
});

export type MeetingMinutesPayloadParsed = z.infer<
  typeof MeetingMinutesPayloadSchema
>;

const REQUIRED_TOP_LEVEL_KEYS = [
  "metadata",
  "minutes_of_meeting",
  "issue_tracker",
  "project_plan",
  "raid_log",
] as const;

/** Detect the Meeting Minutes structured JSON shape. */
export function isMeetingMinutesPayload(
  record: Record<string, unknown>
): boolean {
  return REQUIRED_TOP_LEVEL_KEYS.every((key) => key in record);
}

/** Parse meeting payload only when it fully matches the schema. */
export function parseMeetingMinutesPayload(
  value: unknown
): MeetingMinutesPayloadParsed | null {
  const result = MeetingMinutesPayloadSchema.safeParse(value);
  return result.success ? result.data : null;
}
