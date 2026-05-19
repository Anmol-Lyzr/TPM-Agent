import type { AgentParseMeta, ParsedAgentResponse } from "@/types/tpm";

export interface ParseDiagnosticInput {
  sourceMarkdown: string;
  parsed: ParsedAgentResponse;
  usedStructuredJson: boolean;
  sectionKeysFound: string[];
  extensionKeysFound: string[];
}

/** Compare raw markdown sections vs parsed arrays; log in dev. */
export function buildParseDiagnostics(
  input: ParseDiagnosticInput
): AgentParseMeta {
  const warnings: string[] = [];
  const { parsed, sourceMarkdown } = input;

  if (!sourceMarkdown.trim()) {
    warnings.push("Agent reply was empty after normalization.");
  }

  const sectionLengths = {
    confluence: parsed.sections.confluence.length,
    jira: parsed.sections.jira.length,
    smartsheet: parsed.sections.smartsheet.length,
    raid: parsed.sections.raid.length,
  };

  if (sectionLengths.jira > 0 && parsed.issues.length === 0) {
    warnings.push(
      "JIRA section has content but no issues were parsed — check table format."
    );
  }
  if (sectionLengths.smartsheet > 0 && parsed.projectPlan.length === 0) {
    warnings.push(
      "Smartsheet section has content but no project plan rows were parsed."
    );
  }
  if (sectionLengths.confluence > 0 && !parsed.meetingMinutes.rawBody) {
    warnings.push(
      "Confluence section present but meeting minutes body is empty."
    );
  }
  if (sectionLengths.raid > 0 && parsed.raidLog.length === 0) {
    warnings.push(
      "RAID section has content but no RAID rows were parsed."
    );
  }

  if (parsed.issues.some((i) => !i.key || i.key.startsWith("NEW-"))) {
    warnings.push(
      "Some Jira rows are missing a valid issue key (showing placeholder keys)."
    );
  }

  const meta: AgentParseMeta = {
    warnings,
    sectionKeysFound: input.sectionKeysFound,
    extensionKeysFound: input.extensionKeysFound,
    usedStructuredJson: input.usedStructuredJson,
    parsedAt: new Date().toISOString(),
    counts: {
      issues: parsed.issues.length,
      projectPlan: parsed.projectPlan.length,
      raidLog: parsed.raidLog.length,
      momListSections:
        parsed.meetingMinutes.attendees.length +
        parsed.meetingMinutes.decisions.length +
        parsed.meetingMinutes.actionItems.length,
    },
  };

  logParseDiagnostics(sourceMarkdown, parsed, meta);
  return meta;
}

export function logParseDiagnostics(
  raw: string,
  parsed: ParsedAgentResponse,
  meta: AgentParseMeta
): void {
  if (typeof process === "undefined") return;
  if (process.env.NODE_ENV === "production" && meta.warnings.length === 0) {
    return;
  }

  const preview = raw.length > 400 ? `${raw.slice(0, 400)}…` : raw;

  console.info("[TPM Agent] parse diagnostics", {
    warnings: meta.warnings,
    counts: meta.counts,
    sections: {
      confluence: parsed.sections.confluence.length,
      jira: parsed.sections.jira.length,
      smartsheet: parsed.sections.smartsheet.length,
      raid: parsed.sections.raid.length,
    },
    extensions: Object.keys(parsed.extensions),
    usedStructuredJson: meta.usedStructuredJson,
    rawPreview: preview,
  });
}
