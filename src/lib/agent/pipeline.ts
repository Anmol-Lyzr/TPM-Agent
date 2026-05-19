import { formatAgentTextReply } from "@/lib/formatAgentText";
import { parseAgentMarkdown } from "@/lib/parseAgentResponse";
import { filterBugsFromProjectPlan } from "@/lib/projectPlan";
import { buildRaidLog, enrichParsedRaid, formatRaidLogMarkdown } from "@/lib/raidLog";
import type { ParsedAgentResponse } from "@/types/tpm";

import { buildParseDiagnostics } from "./diagnostics";
import { normalizeParsedResponse } from "./normalize";
import { tryParseStructuredPayload } from "./structuredJson";
import { LyzrUpstreamResponseSchema } from "./schema";

export interface ParseAgentOutputOptions {
  /** Normalized markdown from Lyzr (preferred). */
  markdown?: string;
  /** Raw upstream JSON from Lyzr chat API. */
  upstream?: Record<string, unknown>;
  transcript?: string;
}

export interface ParseAgentOutputResult {
  /** Normalized reply text (same as persisted rawReply). */
  reply: string;
  parsed: ParsedAgentResponse;
}

/**
 * Single entry point: unwrap upstream → markdown/JSON → sections → validated UI state.
 */
export function parseAgentOutput(
  options: ParseAgentOutputOptions
): ParseAgentOutputResult {
  const reply = resolveReplyText(options);
  const structured = tryParseStructuredPayload(reply);
  const fromMarkdown = parseAgentMarkdown(reply, {
    transcript: options.transcript,
  });

  const sections = {
    confluence:
      fromMarkdown.sections.confluence ||
      structured?.sections.confluence ||
      (typeof structured?.meetingMinutes?.rawBody === "string"
        ? structured.meetingMinutes.rawBody
        : ""),
    jira:
      fromMarkdown.sections.jira ||
      (typeof structured?.sections.jira === "string"
        ? structured.sections.jira
        : ""),
    smartsheet:
      fromMarkdown.sections.smartsheet ||
      (typeof structured?.sections.smartsheet === "string"
        ? structured.sections.smartsheet
        : ""),
    raid: fromMarkdown.sections.raid,
  };

  const issues =
    fromMarkdown.issues.length > 0
      ? fromMarkdown.issues
      : (structured?.issues ?? []);

  const rawPlan =
    fromMarkdown.projectPlan.length > 0
      ? fromMarkdown.projectPlan
      : (structured?.projectPlan ?? []);
  const projectPlan = filterBugsFromProjectPlan(rawPlan, issues);

  let raidLog = fromMarkdown.raidLog;
  if (raidLog.length === 0 && structured?.raidLog?.length) {
    raidLog = structured.raidLog;
  }

  const meetingMinutes = {
    ...fromMarkdown.meetingMinutes,
    ...(structured?.meetingMinutes ?? {}),
    rawBody:
      fromMarkdown.meetingMinutes.rawBody ||
      structured?.meetingMinutes?.rawBody ||
      sections.confluence,
    attendees:
      fromMarkdown.meetingMinutes.attendees.length > 0
        ? fromMarkdown.meetingMinutes.attendees
        : (structured?.meetingMinutes?.attendees ?? []),
    decisions:
      fromMarkdown.meetingMinutes.decisions.length > 0
        ? fromMarkdown.meetingMinutes.decisions
        : (structured?.meetingMinutes?.decisions ?? []),
    actionItems:
      fromMarkdown.meetingMinutes.actionItems.length > 0
        ? fromMarkdown.meetingMinutes.actionItems
        : (structured?.meetingMinutes?.actionItems ?? []),
  };

  if (raidLog.length === 0) {
    raidLog = buildRaidLog(
      sections.raid,
      sections.confluence,
      meetingMinutes,
      options.transcript,
      issues
    );
  }

  const raidSection =
    sections.raid.trim() || formatRaidLogMarkdown(raidLog);

  const extensions = {
    ...fromMarkdown.extensions,
    ...(structured?.extensions ?? {}),
  };

  const draft: ParsedAgentResponse = normalizeParsedResponse({
    issues,
    projectPlan,
    raidLog,
    meetingMinutes,
    confluenceLink:
      fromMarkdown.confluenceLink ?? structured?.confluenceLink ?? null,
    sections: { ...sections, raid: raidSection },
    rawSections: {
      confluence: sections.confluence,
      jira: sections.jira,
      smartsheet: sections.smartsheet,
      raid: raidSection,
    },
    sourceMarkdown: reply,
    extensions,
    extra: structured?.extra ?? {},
  });

  const withRaid = enrichParsedRaid(draft, options.transcript);

  const parseMeta = buildParseDiagnostics({
    sourceMarkdown: reply,
    parsed: withRaid,
    usedStructuredJson: Boolean(structured),
    sectionKeysFound: fromMarkdown.sectionKeysFound,
    extensionKeysFound: [
      ...new Set([
        ...fromMarkdown.extensionKeysFound,
        ...Object.keys(extensions),
      ]),
    ],
  });

  return {
    reply,
    parsed: { ...withRaid, parseMeta },
  };
}

function resolveReplyText(options: ParseAgentOutputOptions): string {
  if (options.markdown?.trim()) {
    return options.markdown.trim();
  }
  if (options.upstream) {
    LyzrUpstreamResponseSchema.safeParse(options.upstream);
    return formatAgentTextReply(options.upstream).trim();
  }
  return "";
}

/** Backward-compatible alias used by tests and legacy imports. */
export function parseAgentResponse(
  markdown: string,
  options?: { transcript?: string }
): ParsedAgentResponse {
  return parseAgentOutput({ markdown, transcript: options?.transcript }).parsed;
}
