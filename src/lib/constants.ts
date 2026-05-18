import type { ParsedAgentResponse } from "@/types/tpm";

export const AGENT_ID = "6a06c9cbc5ab512e5b0d21e5";

export const emptyParsed: ParsedAgentResponse = {
  issues: [],
  projectPlan: [],
  tasks: [],
  meetingMinutes: {
    attendees: [],
    decisions: [],
    actionItems: [],
    risks: [],
    openQuestions: [],
  },
  confluenceLink: null,
  rawSections: {},
  sections: { confluence: "", jira: "", smartsheet: "" },
};
