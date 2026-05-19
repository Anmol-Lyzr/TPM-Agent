import { readFileSync } from "node:fs";
import { join } from "node:path";

import { isMeetingMinutesPayload } from "./meetingSchema";
import { tryParseStructuredPayload } from "./structuredJson";

const VALID_FIXTURE = readFileSync(
  join(import.meta.dirname, "meetingPayload.fixture.json"),
  "utf8"
);

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const valid = tryParseStructuredPayload(VALID_FIXTURE);
assert(valid !== null, "valid meeting JSON must parse");
assert(
  valid!.meetingMinutes.title === "RPT Tracker Sync",
  "valid fixture maps meeting title"
);
assert(
  valid!.projectPlan.some((r) => r.isMilestone),
  "valid fixture maps project plan"
);

const malformed = JSON.parse(VALID_FIXTURE) as Record<string, unknown>;
malformed.project_plan = {
  assumptions: { sprint_duration_weeks: 2, target_ga_date: "2026-08-01" },
  milestones: "not-an-array",
};

assert(
  isMeetingMinutesPayload(malformed),
  "malformed payload still has meeting-minutes top-level keys"
);

const malformedResult = tryParseStructuredPayload(JSON.stringify(malformed));
assert(
  malformedResult === null,
  "schema-invalid meeting JSON must not unsafe-cast; returns null for markdown fallback"
);

const malformedWithLegacy = {
  ...malformed,
  issues: [
    {
      key: "SCRUM-1",
      summary: "Legacy row",
      action: "unknown",
      status: "Open",
    },
  ],
};

const legacyFallback = tryParseStructuredPayload(
  JSON.stringify(malformedWithLegacy)
);
assert(legacyFallback !== null, "invalid meeting JSON with legacy issues falls back");
assert(
  legacyFallback!.issues.some((i) => i.key === "SCRUM-1"),
  "legacy fallback parses top-level issues"
);
assert(
  legacyFallback!.projectPlan.length === 0,
  "legacy fallback does not use broken meeting project_plan"
);

console.log("structuredJson.test.ts: all assertions passed");
