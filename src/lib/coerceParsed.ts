import { normalizeParsedResponse } from "@/lib/agent/normalize";
import type { ParsedAgentResponse } from "@/types/legacyTpm";

const _emptyParsed: ParsedAgentResponse = {
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
  parseMeta: {
    warnings: [],
    sectionKeysFound: [],
    extensionKeysFound: [],
    usedStructuredJson: false,
    parsedAt: new Date(0).toISOString(),
    counts: { issues: 0, projectPlan: 0, raidLog: 0, momListSections: 0 },
  },
};

/**
 * Normalize persisted documents (legacy shapes, partial agent payloads, MongoDB docs).
 */
export function coerceParsed(
  input: unknown,
  options?: { sourceMarkdown?: string; transcript?: string }
): ParsedAgentResponse {
  if (!input || typeof input !== "object") {
    return { ..._emptyParsed };
  }

  const raw = input as Record<string, unknown>;
  const sourceMarkdown =
    options?.sourceMarkdown ??
    (typeof raw.sourceMarkdown === "string" ? raw.sourceMarkdown : "");

  return normalizeParsedResponse({ ...raw, sourceMarkdown }, _emptyParsed);
}
