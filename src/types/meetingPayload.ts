/** Agent structured output — Meeting Minutes and Project Tracking Schema. */

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

export interface MeetingAttendee {
  name: string;
  initials: string;
  role: string;
  organization: string;
}

export interface ProductContext {
  product_name: string;
  description: string;
  core_capabilities: string[];
  value_propositions: string[];
}

export interface DiscussionTopicDetails {
  key_points: string[];
  risks: string[];
  decisions: string[];
  dependencies: string[];
}

export interface DiscussionTopic {
  topic_id: string;
  title: string;
  summary: string;
  details: DiscussionTopicDetails;
}

export interface MeetingDecision {
  decision_id: string;
  decision: string;
  made_by: string[];
  priority: "Low" | "Medium" | "High" | "Critical";
  related_modules: string[];
}

export interface MeetingActionItem {
  action_id: string;
  title: string;
  description: string;
  owner: string[];
  sprint: string;
  status: "To Do" | "In Progress" | "Done" | "Blocked";
  priority: "Low" | "Medium" | "High" | "Critical";
  due_date: string;
  target_outcome: string;
  dependencies: string[];
}

export interface SprintPriorityItem {
  rank: number;
  item: string;
  type: "Bug" | "Story" | "Task" | "Milestone";
}

export interface SprintPriorities {
  sprint: string;
  priorities: SprintPriorityItem[];
}

export interface JiraIssuePayload {
  issue_key: string;
  issue_type: "Bug" | "Story" | "Task" | "Epic";
  summary: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "To Do" | "In Progress" | "Done" | "Blocked";
  assignee: string;
  reporter: string;
  sprint: string;
  epic: string;
  labels: string[];
  story_points: number;
  blocked_by: string[];
  due_date: string;
  acceptance_criteria: string[];
}

export interface ProjectPlanTask {
  task_id: string;
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
  milestone_id: string;
  title: string;
  start_date: string;
  end_date: string;
  owner: string;
  status: "Not Started" | "In Progress" | "Completed";
  dependencies: string[];
  tasks: ProjectPlanTask[];
}

export interface ProjectPlanPayload {
  assumptions: {
    sprint_duration_weeks: number;
    target_ga_date: string;
  };
  milestones: ProjectPlanMilestone[];
}

export interface BugTrackerEntry {
  bug_id: string;
  summary: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  priority: "P1" | "P2" | "P3" | "P4";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  reporter: string;
  assignee: string;
  module: string;
  root_cause: string;
  steps_to_reproduce: string[];
  impact: string;
  workaround: string;
  resolution_plan: string;
  date_opened: string;
  date_resolved: string | null;
}

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

export interface DocumentMetadata {
  generated_at: string;
  generated_by: string;
  source: "Meeting Transcript" | "MS Teams" | "Manual Notes";
  document_version: string;
}

export interface MeetingMinutesPayload {
  meeting_metadata: MeetingMetadata;
  attendees: MeetingAttendee[];
  product_context: ProductContext;
  discussion_topics: DiscussionTopic[];
  decisions: MeetingDecision[];
  action_items: MeetingActionItem[];
  sprint_priorities: SprintPriorities[];
  jira_issues: JiraIssuePayload[];
  project_plan: ProjectPlanPayload;
  bug_tracker: BugTrackerEntry[];
  raid_log: RaidLogPayload;
  metadata: DocumentMetadata;
}
