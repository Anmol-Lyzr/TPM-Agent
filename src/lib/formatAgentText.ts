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

function normalizeReply(reply: string): string {
  return reply.replace(/\\n/g, "\n");
}

/** Turn upstream agent payloads into clean markdown/text for the console. */
export function formatAgentTextReply(
  raw: string | Record<string, unknown>
): string {
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return formatAgentTextReply(extractTextFromObject(raw));
  }

  let text = normalizeReply(String(raw).trim());
  if (!text) return "";

  text = unwrapMarkdownFence(text);

  for (let depth = 0; depth < 6; depth++) {
    const fromMarkdown = extractAnswerMarkdownFromText(text);
    if (fromMarkdown) {
      text = normalizeReply(fromMarkdown.trim());
      continue;
    }

    if (!looksLikeJsonObject(text)) break;

    const parsed = tryParseJsonObject(text);
    if (!parsed) break;

    const next = extractTextFromObject(parsed);
    if (!next || next === text) break;
    text = normalizeReply(unwrapMarkdownFence(next.trim()));
  }

  return decodeLiteralUnicodeEscapes(text).trim();
}

function extractTextFromObject(data: Record<string, unknown>): string {
  for (const key of TEXT_FIELD_KEYS) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = extractTextFromObject(value as Record<string, unknown>);
      if (nested && !looksLikeJsonObject(nested)) return nested;
    }
  }

  if (data.data && typeof data.data === "object" && data.data !== null) {
    const nested = extractTextFromObject(data.data as Record<string, unknown>);
    if (nested && !looksLikeJsonObject(nested)) return nested;
  }

  const stringValues = Object.values(data).filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0
  );
  if (stringValues.length === 1) return stringValues[0];

  return JSON.stringify(data);
}

function tryParseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* fall through */
  }
  return null;
}

/** Pull `answer_markdown` even when the payload is not strict JSON. */
function extractAnswerMarkdownFromText(text: string): string | null {
  if (!text.includes("answer_markdown")) return null;

  const match = text.match(
    /"answer_markdown"\s*:\s*"((?:\\.|[^"\\])*)"/
  );
  if (!match?.[1]) return null;

  return decodeJsonStringContent(match[1]);
}

function decodeJsonStringContent(inner: string): string {
  try {
    return JSON.parse(`"${inner}"`);
  } catch {
    return inner
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
        String.fromCharCode(parseInt(hex, 16))
      );
  }
}

/** Decode literal \\uXXXX sequences left in the string after partial parsing. */
function decodeLiteralUnicodeEscapes(text: string): string {
  if (!/\\u[0-9a-fA-F]{4}/.test(text)) return text;

  try {
    return JSON.parse(
      `"${text
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")}"`
    );
  } catch {
    return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    );
  }
}

function looksLikeJsonObject(text: string): boolean {
  const t = text.trim();
  return t.startsWith("{") && t.endsWith("}");
}

function unwrapMarkdownFence(text: string): string {
  const match = text.match(/^```(?:json|markdown|text)?\s*\n?([\s\S]*?)\n?```$/i);
  return match ? match[1].trim() : text;
}
