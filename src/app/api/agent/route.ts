import { NextRequest, NextResponse } from "next/server";
import { callAgent, createSessionId } from "@/lib/lyzr";
import { extractAgentPayload } from "@/lib/agent/pipeline";
import { upsertSession } from "@/lib/db/sessions";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.LYZR_API_KEY;
    const agentId = process.env.LYZR_AGENT_ID;
    const userId = process.env.LYZR_USER_ID;
    if (!apiKey || !agentId || !userId) {
      return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
    }

    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const sessionId =
      (typeof body.session_id === "string" && body.session_id) ||
      createSessionId(agentId);

    const { sessionId: returnedSessionId, raw } = await callAgent({
      message,
      sessionId,
      apiKey,
      agentId,
      userId,
    });

    const payload = extractAgentPayload(raw);

    let persisted = false;
    let persistError: string | undefined;
    try {
      await upsertSession(returnedSessionId, {
        payload,
        transcript: typeof body.transcript === "string" ? body.transcript.trim() || undefined : undefined,
      });
      persisted = true;
    } catch (err) {
      persistError = err instanceof Error ? err.message : "DB persist failed";
    }

    return NextResponse.json({
      session_id: returnedSessionId,
      payload,
      persisted,
      persist_error: persistError,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
