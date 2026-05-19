/**
 * Legacy type definitions preserved for backward compatibility.
 * These types were removed from tpm.ts as part of the direct-payload rewrite
 * but are still referenced by non-critical utility files.
 */

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
  wbsId?: string;
  taskName?: string;
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
  impact: string;
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
  rawBody?: string;
}

export interface AgentMainSections {
  confluence: string;
  jira: string;
  smartsheet: string;
  raid: string;
}

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
  sourceMarkdown: string;
  extensions: Record<string, string>;
  extra: Record<string, unknown>;
  parseMeta: AgentParseMeta;
}
