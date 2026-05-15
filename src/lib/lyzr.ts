const LYZR_API_URL = "https://agent-prod.studio.lyzr.ai/v3/inference/chat/";

export function extractReply(data: Record<string, unknown>): string {
  if (typeof data.response === "string" && data.response) return data.response;
  if (typeof data.message === "string" && data.message) return data.message;
  if (typeof data.content === "string" && data.content) return data.content;
  if (typeof data.reply === "string" && data.reply) return data.reply;
  return JSON.stringify(data);
}

export function normalizeReply(reply: string): string {
  return reply.replace(/\\n/g, "\n");
}

export interface CallAgentParams {
  message: string;
  sessionId: string;
  apiKey: string;
  agentId: string;
  userId: string;
}

export interface CallAgentResult {
  reply: string;
  sessionId: string;
  raw: Record<string, unknown>;
}

export async function callAgent(
  params: CallAgentParams
): Promise<CallAgentResult> {
  const upstreamRes = await fetch(LYZR_API_URL, {
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

  if (!upstreamRes.ok) {
    const text = await upstreamRes.text();
    throw new Error(`Upstream error ${upstreamRes.status}: ${text}`);
  }

  const data = (await upstreamRes.json()) as Record<string, unknown>;
  const reply = normalizeReply(extractReply(data));
  const sessionId =
    (typeof data.session_id === "string" && data.session_id) ||
    params.sessionId;

  return { reply, sessionId, raw: data };
}

export function createSessionId(agentId: string): string {
  const suffix = Math.random().toString(36).slice(2, 14);
  return `${agentId}-${suffix}`;
}
