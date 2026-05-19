import type { MeetingMinutesPayload } from "@/types/meetingPayload";

const PAYLOAD_KEYS = ["metadata", "minutes_of_meeting", "issue_tracker", "project_plan", "raid_log"] as const;

export function extractAgentPayload(
  upstream: Record<string, unknown>
): MeetingMinutesPayload | null {
  // check upstream itself
  if (PAYLOAD_KEYS.every(k => k in upstream)) {
    return upstream as unknown as MeetingMinutesPayload;
  }
  // check each direct field value (the payload may be nested one level)
  for (const value of Object.values(upstream)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      if (PAYLOAD_KEYS.every(k => k in obj)) {
        return obj as unknown as MeetingMinutesPayload;
      }
    }
  }
  return null;
}
