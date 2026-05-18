export type JiraAction = "created" | "updated" | "commented" | "unknown";

export interface JiraIssueRow {
  key: string;
  summary: string;
  action: JiraAction;
  status?: string;
  issueType?: string;
  assignee?: string;
  dueDate?: string;
  priority?: string;
  url?: string;
}

export interface ProjectPlanRow {
  taskDesc: string;
  start: string;
  end: string;
  duration: string;
  owner: string;
  dependency: string;
  comments: string;
  taskNumber?: number;
}

export interface TaskRow {
  taskNumber: number;
  description: string;
  owner: string;
  start: string;
  end: string;
  dependency: string;
  status: "Scheduled" | "Unscheduled";
}

export interface MeetingMinutes {
  title?: string;
  date?: string;
  attendees: string[];
  summary?: string;
  decisions: string[];
  actionItems: string[];
  risks: string[];
  openQuestions: string[];
  confluenceLink?: string;
  confluenceTitle?: string;
  /** Full Confluence section markdown when structured parse is partial */
  rawBody?: string;
}

export interface AgentMainSections {
  confluence: string;
  jira: string;
  smartsheet: string;
}

export interface ParsedAgentResponse {
  issues: JiraIssueRow[];
  projectPlan: ProjectPlanRow[];
  tasks: TaskRow[];
  meetingMinutes: MeetingMinutes;
  confluenceLink: string | null;
  rawSections: Record<string, string>;
  sections: AgentMainSections;
}

export type DashboardTabId = "plan" | "issues" | "tasks" | "mom";

export interface RefineRequestContext {
  activeTab: DashboardTabId;
  snapshot: unknown;
}

export interface AgentApiRequest {
  message: string;
  session_id?: string;
  mode?: "analyze" | "refine";
  context?: RefineRequestContext;
}

export interface AgentApiResponse {
  reply: string;
  session_id: string;
  parsed: ParsedAgentResponse;
  persisted?: boolean;
  persist_error?: string;
  error?: string;
}
