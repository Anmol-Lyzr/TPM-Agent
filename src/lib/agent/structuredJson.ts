import type {
  AgentMainSections,
  JiraIssueRow,
  MeetingMinutes,
  ProjectPlanRow,
  RaidLogRow,
} from "@/types/tpm";

import {
  normalizeJiraIssueRow,
  normalizeMeetingMinutes,
  normalizeProjectPlanRow,
  normalizeRaidLogRow,
  normalizeSections,
} from "./normalize";
import { StructuredTpmPayloadSchema } from "./schema";

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
      const hasShape =
        Array.isArray(record.issues) ||
        Array.isArray(record.projectPlan) ||
        Array.isArray(record.raidLog) ||
        record.meetingMinutes != null ||
        record.sections != null ||
        typeof record.confluence === "string";

      if (!hasShape) continue;

      const validated = StructuredTpmPayloadSchema.safeParse(json);
      const data = validated.success ? validated.data : record;
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
        record.raidLog ??
          (Array.isArray(record.raid) ? record.raid : undefined),
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
    } catch {
      /* try next candidate */
    }
  }

  return null;
}
