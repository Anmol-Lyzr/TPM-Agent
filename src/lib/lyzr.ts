const LYZR_API_URL = "https://agent-prod.studio.lyzr.ai/v3/inference/chat/";

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

export async function callAgent(
  params: CallAgentParams
): Promise<CallAgentResult> {
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
    throw new Error(`Upstream error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const sessionId =
    (typeof data.session_id === "string" && data.session_id) ||
    params.sessionId;

  return { sessionId, raw: data };
}

export function createSessionId(agentId: string): string {
  const suffix = Math.random().toString(36).slice(2, 14);
  return `${agentId}-${suffix}`;
}
