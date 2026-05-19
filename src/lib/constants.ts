import { emptyParseMeta } from "@/lib/agent/normalize";
import type { ParsedAgentResponse } from "@/types/tpm";

export const AGENT_ID = "6a06c9cbc5ab512e5b0d21e5";

/** Default Lyzr agent for meeting Q&A console (override with LYZR_CONSOLE_AGENT_ID). */
export const CONSOLE_AGENT_ID = "6a0c31614ac758948d1cb035";

export const emptyParsed: ParsedAgentResponse = {
  issues: [],
  projectPlan: [],
  raidLog: [],
  meetingMinutes: {
    attendees: [],
    decisions: [],
    actionItems: [],
    risks: [],
    openQuestions: [],
  },
  confluenceLink: null,
  rawSections: {},
  sections: { confluence: "", jira: "", smartsheet: "", raid: "" },
  sourceMarkdown: "",
  extensions: {},
  extra: {},
  parseMeta: emptyParseMeta(),
};
