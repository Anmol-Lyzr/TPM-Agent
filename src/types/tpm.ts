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
  /** WBS ID (e.g. 0, 1.1.1, M1). */
  wbsId?: string;
  /** Short task / milestone label (Smartsheet "Task Name"). */
  taskName?: string;
  /** Longer task detail (Smartsheet "Task Description"). */
  taskDesc: string;
  start: string;
  end: string;
  duration: string;
  owner: string;
  dependency: string;
  status?: string;
  priority?: string;
  comments: string;
  taskNumber?: number;
  /** Agent Smartsheet rows marked as Milestone (section headers in the schedule). */
  isMilestone?: boolean;
  milestoneTitle?: string;
}

export type RaidCategory = "Risk" | "Assumption" | "Issue" | "Dependency";

export type RaidStatus = "Open" | "Mitigating" | "Closed" | "Accepted";

export interface RaidLogRow {
  id: string;
  category: RaidCategory;
  description: string;
  owner: string;
  /** Severity or business impact */
  impact: string;
  /** Likelihood (primarily for risks) */
  probability: string;
  status: RaidStatus;
  mitigation: string;
  targetDate: string;
  notes: string;
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
  raid: string;
}

/** Parse quality metadata — surfaced in UI when warnings exist. */
export interface AgentParseMeta {
  warnings: string[];
  sectionKeysFound: string[];
  extensionKeysFound: string[];
  usedStructuredJson: boolean;
  parsedAt: string;
  counts: {
    issues: number;
    projectPlan: number;
    raidLog: number;
    momListSections: number;
  };
}

export interface ParsedAgentResponse {
  issues: JiraIssueRow[];
  projectPlan: ProjectPlanRow[];
  raidLog: RaidLogRow[];
  meetingMinutes: MeetingMinutes;
  confluenceLink: string | null;
  rawSections: Record<string, string>;
  sections: AgentMainSections;
  /** Full normalized markdown/text from the agent (1:1 source for re-parse). */
  sourceMarkdown: string;
  /** Extra markdown sections not mapped to the four canonical buckets. */
  extensions: Record<string, string>;
  /** Unmapped fields from structured JSON payloads (preserved for forward compatibility). */
  extra: Record<string, unknown>;
  parseMeta: AgentParseMeta;
}

export type DashboardTabId = "plan" | "issues" | "raid" | "mom";

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
  parse_meta?: AgentParseMeta;
  persisted?: boolean;
  persist_error?: string;
  error?: string;
}
