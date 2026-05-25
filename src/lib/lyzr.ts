const LYZR_API_URL = "https://agent-prod.studio.lyzr.ai/v3/inference/chat/";
const LYZR_RETRY_DELAYS_MS = [600, 1400];

export interface CallAgentParams {
  message: string;
  sessionId: string;
  apiKey: string;
  agentId: string;
  userId: string;
}

export interface CallAgentResult {
  sessionId: string;
  raw: Record<string, unknown>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtml(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function shouldRetryLyzrStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

export function formatLyzrUpstreamError(status: number, body: string): string {
  const cleanBody = body.trim().startsWith("<") ? stripHtml(body) : body.trim();
  if (status === 502 && /bad gateway/i.test(cleanBody)) {
    return "Lyzr upstream returned 502 Bad Gateway. Please retry in a moment.";
  }
  const detail = cleanBody.slice(0, 300);
  return detail
    ? `Lyzr upstream returned ${status}: ${detail}`
    : `Lyzr upstream returned ${status}`;
}

export async function callAgent(
  params: CallAgentParams
): Promise<CallAgentResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= LYZR_RETRY_DELAYS_MS.length; attempt++) {
    const res = await fetch(LYZR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": params.apiKey,
      },
      body: JSON.stringify({
        user_id: params.userId,
        agent_id: params.agentId,
        session_id: params.sessionId,
        message: params.message,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      lastError = new Error(formatLyzrUpstreamError(res.status, text));
      const retryDelay = LYZR_RETRY_DELAYS_MS[attempt];
      if (shouldRetryLyzrStatus(res.status) && retryDelay !== undefined) {
        await sleep(retryDelay);
        continue;
      }
      throw lastError;
    }

    const data = (await res.json()) as Record<string, unknown>;
    const sessionId =
      (typeof data.session_id === "string" && data.session_id) ||
      params.sessionId;

    return { sessionId, raw: data };
  }

  throw lastError ?? new Error("Lyzr upstream request failed");
}

export function createSessionId(agentId: string): string {
  const suffix = Math.random().toString(36).slice(2, 14);
  return `${agentId}-${suffix}`;
}
