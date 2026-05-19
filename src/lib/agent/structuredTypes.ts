import type {
  AgentMainSections,
  JiraIssueRow,
  MeetingMinutes,
  ProjectPlanRow,
  RaidLogRow,
} from "@/types/legacyTpm";

export interface StructuredParseResult {
  issues: JiraIssueRow[];
  projectPlan: ProjectPlanRow[];
  raidLog: RaidLogRow[];
  meetingMinutes: Partial<MeetingMinutes>;
  sections: Partial<AgentMainSections>;
  confluenceLink: string | null;
  extensions: Record<string, string>;
  extra: Record<string, unknown>;
}
