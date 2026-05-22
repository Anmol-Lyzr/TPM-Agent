/** CTA machine-executable Jira operations (agent schema). */

export type JiraActionOperation =
  | "create_issue"
  | "update_issue"
  | "transition_status"
  | "add_comment"
  | "assign_user"
  | "link_issues";

export interface JiraActionFields {
  summary: string;
  description: string;
  issuetype: string;
  priority: string;
  assignee: string;
  reporter: string;
  labels: string[];
  duedate: string;
  parent_key: string;
  epic_link: string;
  story_points: number;
  components: string[];
  fix_versions: string[];
}

export interface CtaJiraAction {
  operation: JiraActionOperation;
  project_key: string;
  issue_key: string;
  fields: JiraActionFields;
  transition_name: string;
  comment_body: string;
  link_type: string;
  linked_issue_key: string;
}

export interface JiraActionStepResult {
  operation: JiraActionOperation;
  issue_key?: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface ExecuteJiraActionsResult {
  ok: boolean;
  steps: JiraActionStepResult[];
  errors: string[];
}
