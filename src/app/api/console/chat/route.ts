import { NextRequest, NextResponse } from "next/server";
import { CONSOLE_AGENT_ID } from "@/lib/constants";
import { getSession } from "@/lib/db/sessions";
import { formatAgentTextReply } from "@/lib/formatAgentText";
import { buildMeetingContextBlock } from "@/lib/meetingContext";
import { callAgent, createSessionId } from "@/lib/lyzr";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.LYZR_API_KEY;
    const userId = process.env.LYZR_USER_ID;
    const agentId =
      process.env.LYZR_CONSOLE_AGENT_ID?.trim() ||
      process.env.LYZR_AGENT_ID?.trim() ||
      CONSOLE_AGENT_ID;

    if (!apiKey || !userId) {
      return NextResponse.json(
        { error: "Missing LYZR_API_KEY or LYZR_USER_ID in environment" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const meetingSessionId =
      typeof body.meeting_session_id === "string"
        ? body.meeting_session_id.trim()
        : "";

    let meetingContext: string | undefined;
    if (meetingSessionId) {
      const doc = await getSession(meetingSessionId);
      if (!doc) {
        return NextResponse.json(
          { error: `Meeting session not found: ${meetingSessionId}` },
          { status: 404 }
        );
      }
      meetingContext = buildMeetingContextBlock({
        sessionId: doc.sessionId,
        transcript: doc.transcript,
        payload: doc.payload,
        title: doc.payload?.metadata?.meeting_title,
      });
    }

    const sessionId =
      (typeof body.session_id === "string" && body.session_id.trim()) ||
      createSessionId(agentId);

    const payload = meetingContext
      ? `${meetingContext}\n\nUser question:\n${message}`
      : message;

    const { reply, sessionId: returnedSessionId, raw } = await callAgent({
      message: payload,
      sessionId,
      apiKey,
      agentId,
      userId,
    });

    return NextResponse.json({
      reply: formatAgentTextReply(reply.trim() ? reply : raw),
      session_id: returnedSessionId,
      meeting_attached: Boolean(meetingContext),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
