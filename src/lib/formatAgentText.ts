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

/** Extract the agent reply string from an upstream JSON payload. */
export function formatAgentTextReply(
  raw: string | Record<string, unknown>
): string {
  if (typeof raw === "string") {
    return raw.replace(/\\n/g, "\n").trim();
  }
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return extractTextFromObject(raw).replace(/\\n/g, "\n").trim();
  }
  return "";
}

function extractTextFromObject(data: Record<string, unknown>): string {
  for (const key of TEXT_FIELD_KEYS) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = extractTextFromObject(value as Record<string, unknown>);
      if (nested) return nested;
    }
  }

  if (data.data && typeof data.data === "object" && data.data !== null) {
    const nested = extractTextFromObject(data.data as Record<string, unknown>);
    if (nested) return nested;
  }

  const stringValues = Object.values(data).filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0
  );
  if (stringValues.length === 1) return stringValues[0];

  return JSON.stringify(data);
}
