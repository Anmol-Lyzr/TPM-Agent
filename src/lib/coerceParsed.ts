import { normalizeParsedResponse } from "@/lib/agent/normalize";
import { parseAgentMarkdown } from "@/lib/parseAgentResponse";
import { buildRaidLog, formatRaidLogMarkdown } from "@/lib/raidLog";
import { emptyParsed } from "@/lib/constants";
import type { ParsedAgentResponse } from "@/types/tpm";

/**
 * Normalize persisted documents (legacy shapes, partial agent payloads, MongoDB docs).
 */
export function coerceParsed(
  input: unknown,
  options?: { sourceMarkdown?: string; transcript?: string }
): ParsedAgentResponse {
  if (!input || typeof input !== "object") {
    return { ...emptyParsed };
  }

  const raw = input as Record<string, unknown>;
  const sourceMarkdown =
    options?.sourceMarkdown ??
    (typeof raw.sourceMarkdown === "string" ? raw.sourceMarkdown : "");

  let normalized = normalizeParsedResponse(raw, emptyParsed);

  if (
    sourceMarkdown.trim() &&
    normalized.projectPlan.length === 0 &&
    normalized.issues.length === 0 &&
    !normalized.meetingMinutes.rawBody
  ) {
    const reparsed = parseAgentMarkdown(sourceMarkdown, {
      transcript: options?.transcript,
    });
    normalized = normalizeParsedResponse(
      {
        ...normalized,
        ...reparsed,
        sourceMarkdown,
        extensions: {
          ...reparsed.extensions,
          ...normalized.extensions,
        },
      },
      emptyParsed
    );
  }

  if (normalized.raidLog.length === 0 && normalized.sections.confluence.trim()) {
    const rebuilt = buildRaidLog(
      normalized.sections.raid,
      normalized.sections.confluence,
      normalized.meetingMinutes,
      options?.transcript,
      normalized.issues
    );
    if (rebuilt.length > 0) {
      normalized = normalizeParsedResponse(
        {
          ...normalized,
          raidLog: rebuilt,
          sections: {
            ...normalized.sections,
            raid:
              normalized.sections.raid.trim() ||
              formatRaidLogMarkdown(rebuilt),
          },
        },
        emptyParsed
      );
    }
  }

  return normalized;
}
