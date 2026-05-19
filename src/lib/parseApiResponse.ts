/**
 * Safely parse a fetch Response as JSON. Vercel timeouts and gateway errors
 * often return plain text (e.g. "An error occurred…") instead of JSON.
 */
export async function parseApiResponse<T extends { error?: string }>(
  res: Response
): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const timeoutHint =
      res.status === 504 ||
      /FUNCTION_INVOCATION_TIMEOUT|timed out|timeout/i.test(text);

    if (timeoutHint) {
      throw new Error(
        "Analysis timed out on the server (over 2 minutes). The Lyzr agent is still running tools on long transcripts—retry with a shorter excerpt, or raise the Vercel function timeout (Pro: up to 300s)."
      );
    }

    const preview = text.replace(/\s+/g, " ").slice(0, 160);
    throw new Error(
      res.ok
        ? `Invalid JSON from server: ${preview}`
        : preview || `Request failed (${res.status})`
    );
  }
}
