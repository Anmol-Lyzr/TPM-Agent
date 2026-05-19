/** Agent structured output — Meeting Minutes and Project Tracking Schema (output.json). */

// ── metadata ─────────────────────────────────────────────────────────────────

export interface MeetingPilotInstallation {
  name: string;
  location: string;
  status: string;
}

export interface MeetingMetadata {
  meeting_title: string;
  date: string;
  duration_minutes: number;
  sprint: string;
  pilot_installation: MeetingPilotInstallation;
  recording_available: boolean;
  platform: string;
}

// ── minutes_of_meeting ──────────────────────────────────────────────────────

export interface MomKeyDecision {
  decision_id: string;
  decision: string;
  decided_by: string;
}

export interface MomActionItem {
  action_id: string;
  action: string;
  owner: string;
  due_date: string;
  status: "Open" | "In Progress" | "Done" | "Blocked";
}

export interface DiscussionHighlight {
  topic: string;
  summary: string;
  related_issue_keys: string[];
}

export interface NextMilestone {
  milestone: string;
  target_date: string;
}

export interface MinutesOfMeeting {
  purpose: string;
  key_decisions: MomKeyDecision[];
  action_items: MomActionItem[];
  discussion_highlights: DiscussionHighlight[];
  /** High-level risk/dependency strings surfaced during the meeting. */
  risks_and_dependencies_summary: string[];
  next_milestones: NextMilestone[];
}

// ── issue_tracker ─────────────────────────────────────────────────────────────

export interface IssueTrackerEntry {
  issue_key: string;
  issue_type: "Bug" | "Story" | "Task" | "Epic";
  summary: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status:
    | "Open"
    | "To Do"
    | "In Progress"
    | "Done"
    | "Blocked"
    | "Resolved"
    | "Closed";
  assignee: string;
  reporter: string;
  sprint: string;
  epic: string;
  labels: string[];
  story_points: number;
  blocked_by: string[];
  due_date: string;
  acceptance_criteria: string[];
  severity: "Low" | "Medium" | "High" | "Critical";
  module: string;
  root_cause: string;
  steps_to_reproduce: string[];
  impact: string;
  workaround: string;
  resolution_plan: string;
  date_opened: string;
  date_resolved: string | null;
}

// ── project_plan ─────────────────────────────────────────────────────────────

export interface ProjectPlanTask {
  task_id: string; // WBS: "1.1", "1.1.1", "1.1.2"
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  owner: string;
  status: "To Do" | "In Progress" | "Done" | "Blocked";
  dependency_ids: string[];
  comments: string;
}

export interface ProjectPlanMilestone {
  milestone_id: string; // WBS: "1", "2", "3"
  milestone_timeline_duration: number;
  title: string;
  start_date: string;
  end_date: string;
  owner: string;
  status: "Not Started" | "In Progress" | "Completed";
  dependencies: string[];
  tasks: ProjectPlanTask[];
}

export interface ProjectPlanPayload {
  project_timeline_duration: number;
  assumptions: {
    sprint_duration_weeks: number;
    target_ga_date: string;
  };
  milestones: ProjectPlanMilestone[];
}

// ── raid_log ─────────────────────────────────────────────────────────────────

export interface RaidRisk {
  risk_id: string;
  description: string;
  category: string;
  probability: "Low" | "Medium" | "High";
  impact: "Low" | "Medium" | "High";
  risk_level: "Low" | "Medium" | "High" | "Critical";
  owner: string;
  identified_date: string;
  mitigation_strategy: string;
  contingency_plan: string;
  status: "Open" | "Mitigated" | "Closed";
  related_tasks: string[];
}

export interface RaidAssumption {
  assumption_id: string;
  description: string;
  owner: string;
  identified_date: string;
  impact_if_invalid: string;
  validation_approach: string;
  status: "Open" | "Validated" | "Invalid";
}

export interface RaidIssue {
  issue_id: string;
  description: string;
  category: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  owner: string;
  identified_date: string;
  impact: string;
  resolution_path: string;
  status: "Open" | "In Remediation" | "Closed";
  related_tasks: string[];
}

export interface RaidDependency {
  dependency_id: string;
  description: string;
  type: "Internal" | "External";
  owner: string;
  provider: string;
  dependent_tasks: string[];
  identified_date: string;
  expected_resolution_date: string;
  status: "Open" | "Waiting" | "Active" | "Completed";
  impact_if_delayed: string;
}

export interface RaidLogPayload {
  risks: RaidRisk[];
  assumptions: RaidAssumption[];
  issues: RaidIssue[];
  dependencies: RaidDependency[];
}

// ── top-level payload ────────────────────────────────────────────────────────

export interface MeetingMinutesPayload {
  metadata: MeetingMetadata;
  minutes_of_meeting: MinutesOfMeeting;
  issue_tracker: IssueTrackerEntry[];
  project_plan: ProjectPlanPayload;
  raid_log: RaidLogPayload;
}
