import { NextRequest, NextResponse } from "next/server";
import { callAgent, createSessionId } from "@/lib/lyzr";
import { parseAgentResponse } from "@/lib/parseAgentResponse";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.LYZR_API_KEY;
    const agentId = process.env.LYZR_AGENT_ID;
    const userId = process.env.LYZR_USER_ID;

    if (!apiKey || !agentId || !userId) {
      return NextResponse.json(
        {
          error:
            "Missing LYZR_API_KEY, LYZR_AGENT_ID, or LYZR_USER_ID in environment",
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const mode =
      body.mode === "refine" || body.mode === "analyze" ? body.mode : "analyze";

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    if (mode === "refine") {
      const sid =
        typeof body.session_id === "string" ? body.session_id.trim() : "";
      if (!sid) {
        return NextResponse.json(
          { error: "session_id is required for refine mode" },
          { status: 400 }
        );
      }
    }

    const sessionId =
      (typeof body.session_id === "string" && body.session_id) ||
      createSessionId(agentId);

    const { reply, sessionId: returnedSessionId } = await callAgent({
      message,
      sessionId,
      apiKey,
      agentId,
      userId,
    });

    const parsed = parseAgentResponse(reply);

    return NextResponse.json({
      reply,
      session_id: returnedSessionId,
      parsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
