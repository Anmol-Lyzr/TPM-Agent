import type { MeetingMinutesPayload } from "@/types/meetingPayload";
import { isMeetingMinutesPayload, parseMeetingMinutesPayload } from "./meetingSchema";

const TEXT_FIELD_KEYS = [
  "answer_markdown",
  "answer",
  "markdown",
  "response",
  "message",
  "content",
  "reply",
  "output",
  "result",
  "text",
] as const;

function extractPayloadFromString(str: string): MeetingMinutesPayload | null {
  const trimmed = str.trim();
  if (!trimmed.includes("minutes_of_meeting")) return null;

  // Handle markdown code fences
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidates: string[] = fenceMatch ? [fenceMatch[1]] : [];

  // Outermost JSON object
  const objMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objMatch) candidates.push(objMatch[0]);
  candidates.push(trimmed);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
      const obj = parsed as Record<string, unknown>;

      if (isMeetingMinutesPayload(obj)) {
        return parseMeetingMinutesPayload(obj) ?? (obj as unknown as MeetingMinutesPayload);
      }

      // One level of nesting
      for (const val of Object.values(obj)) {
        if (val && typeof val === "object" && !Array.isArray(val)) {
          const nested = val as Record<string, unknown>;
          if (isMeetingMinutesPayload(nested)) {
            return parseMeetingMinutesPayload(nested) ?? (nested as unknown as MeetingMinutesPayload);
          }
        }
      }
    } catch {
      // not valid JSON
    }
  }
  return null;
}

function searchObject(
  obj: Record<string, unknown>,
  depth = 0
): MeetingMinutesPayload | null {
  if (depth > 4) return null;

  if (isMeetingMinutesPayload(obj)) {
    return parseMeetingMinutesPayload(obj) ?? (obj as unknown as MeetingMinutesPayload);
  }

  // Check known text fields first
  for (const key of TEXT_FIELD_KEYS) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) {
      const found = extractPayloadFromString(val);
      if (found) return found;
    }
  }

  // Check all remaining string fields
  for (const val of Object.values(obj)) {
    if (typeof val === "string" && val.includes("minutes_of_meeting")) {
      const found = extractPayloadFromString(val);
      if (found) return found;
    }
  }

  // Recurse into nested objects
  for (const val of Object.values(obj)) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const found = searchObject(val as Record<string, unknown>, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

export function extractAgentPayload(
  upstream: Record<string, unknown>
): MeetingMinutesPayload | null {
  return searchObject(upstream);
}
