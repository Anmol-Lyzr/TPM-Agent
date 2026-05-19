import type { AgentMainSections, MeetingMinutes } from "@/types/tpm";

import {
  isMeetingMinutesPayload,
  parseMeetingMinutesPayload,
} from "./meetingSchema";
import { mapMeetingMinutesPayload } from "./mapMeetingPayload";
import {
  normalizeJiraIssueRow,
  normalizeMeetingMinutes,
  normalizeProjectPlanRow,
  normalizeRaidLogRow,
  normalizeSections,
} from "./normalize";
import { StructuredTpmPayloadSchema } from "./schema";
import type { StructuredParseResult } from "./structuredTypes";

export type { StructuredParseResult } from "./structuredTypes";

function slugifySection(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

function parseArray<T>(
  value: unknown,
  mapRow: (row: unknown, index: number) => T
): T[] {
  if (!Array.isArray(value)) return [];
  return value.map(mapRow);
}

function parseLegacyStructuredPayload(
  record: Record<string, unknown>
): StructuredParseResult {
  const validated = StructuredTpmPayloadSchema.safeParse(record);
  const extra: Record<string, unknown> = { ...record };
  for (const key of [
    "confluence",
    "meetingMinutes",
    "jira",
    "issues",
    "smartsheet",
    "projectPlan",
    "raid",
    "raidLog",
    "sections",
    "confluenceLink",
    "extensions",
  ]) {
    delete extra[key];
  }

  const issues = parseArray(
    record.issues ??
      (Array.isArray(record.jira) ? record.jira : undefined),
    normalizeJiraIssueRow
  );

  const projectPlan = parseArray(
    record.projectPlan ??
      (Array.isArray(record.smartsheet) ? record.smartsheet : undefined),
    normalizeProjectPlanRow
  );

  const raidLog = parseArray(
    record.raidLog ?? (Array.isArray(record.raid) ? record.raid : undefined),
    normalizeRaidLogRow
  );

  let meetingMinutes: Partial<MeetingMinutes> = {};
  if (record.meetingMinutes) {
    meetingMinutes = normalizeMeetingMinutes(record.meetingMinutes);
  } else if (typeof record.confluence === "object") {
    meetingMinutes = normalizeMeetingMinutes(record.confluence);
  } else if (typeof record.confluence === "string") {
    meetingMinutes = { rawBody: record.confluence };
  }

  const sections: Partial<AgentMainSections> = record.sections
    ? normalizeSections(record.sections)
    : {
        confluence:
          typeof record.confluence === "string" ? record.confluence : "",
        jira: typeof record.jira === "string" ? record.jira : "",
        smartsheet:
          typeof record.smartsheet === "string" ? record.smartsheet : "",
        raid: typeof record.raid === "string" ? record.raid : "",
      };

  const extensions: Record<string, string> = {};
  if (record.extensions && typeof record.extensions === "object") {
    Object.assign(
      extensions,
      Object.fromEntries(
        Object.entries(record.extensions as Record<string, unknown>).map(
          ([k, v]) => [k, String(v)]
        )
      )
    );
  }
  for (const [key, value] of Object.entries(extra)) {
    if (typeof value === "string" && value.trim()) {
      extensions[slugifySection(key)] = value;
    }
  }

  if (validated.success) {
    void validated.data;
  }

  return {
    issues,
    projectPlan,
    raidLog,
    meetingMinutes,
    sections,
    confluenceLink:
      typeof record.confluenceLink === "string"
        ? record.confluenceLink
        : null,
    extensions,
    extra,
  };
}

function hasLegacyStructuredShape(record: Record<string, unknown>): boolean {
  return (
    Array.isArray(record.issues) ||
    Array.isArray(record.projectPlan) ||
    Array.isArray(record.raidLog) ||
    record.meetingMinutes != null ||
    record.sections != null ||
    typeof record.confluence === "string"
  );
}

/** Try to parse agent reply as embedded JSON (whole body or fenced block). */
export function tryParseStructuredPayload(
  text: string
): StructuredParseResult | null {
  const candidates: string[] = [];

  const trimmed = text.trim();
  if (trimmed.startsWith("{")) candidates.push(trimmed);

  const fence = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  if (fence?.[1]?.trim().startsWith("{")) candidates.push(fence[1].trim());

  for (const candidate of candidates) {
    try {
      const json = JSON.parse(candidate) as unknown;
      if (!json || typeof json !== "object" || Array.isArray(json)) continue;

      const record = json as Record<string, unknown>;

      const meetingPayload = parseMeetingMinutesPayload(json);
      if (meetingPayload) {
        return mapMeetingMinutesPayload(meetingPayload);
      }

      if (isMeetingMinutesPayload(record)) {
        // Top-level keys present but schema invalid — do not unsafe-cast; try legacy or next candidate.
        if (hasLegacyStructuredShape(record)) {
          return parseLegacyStructuredPayload(record);
        }
        continue;
      }

      if (!hasLegacyStructuredShape(record)) continue;

      return parseLegacyStructuredPayload(record);
    } catch {
      /* try next candidate */
    }
  }

  return null;
}
