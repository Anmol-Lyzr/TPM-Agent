import { asString, asStringArray } from "./normalize";

/** Format any agent field for UI — never returns `[object Object]`. */
export function formatDisplayValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const items = value.map((v) => formatDisplayValue(v)).filter(Boolean);
    return items.join(", ");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("markdown" in record && typeof record.markdown === "string") {
      return record.markdown;
    }
    if ("text" in record && typeof record.text === "string") {
      return record.text;
    }
    if ("summary" in record && typeof record.summary === "string") {
      return record.summary;
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return asString(value);
    }
  }
  return asString(value);
}

/** Render list fields (attendees, decisions, …) safely. */
export function formatDisplayList(value: unknown): string[] {
  return asStringArray(value);
}
