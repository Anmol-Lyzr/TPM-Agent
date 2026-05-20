import { NextRequest, NextResponse } from "next/server";
import { CONSOLE_AGENT_ID } from "@/lib/constants";
import { getSession } from "@/lib/db/sessions";
import { buildMeetingContextBlock } from "@/lib/meetingContext";
import { callAgent, createSessionId } from "@/lib/lyzr";

export const runtime = "nodejs";
export const maxDuration = 120;

const TEXT_FIELD_KEYS = [
  "answer_markdown", "answer", "markdown", "response",
  "message", "content", "reply", "output", "result", "text",
] as const;

function extractTextReply(raw: Record<string, unknown>): string {
  for (const key of TEXT_FIELD_KEYS) {
    const val = raw[key];
    if (typeof val === "string" && val.trim()) return val.replace(/\\n/g, "\n").trim();
  }
  return JSON.stringify(raw);
}

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

    const prompt = meetingContext
      ? `${meetingContext}\n\nUser question:\n${message}`
      : message;

    const { sessionId: returnedSessionId, raw } = await callAgent({
      message: prompt,
      sessionId,
      apiKey,
      agentId,
      userId,
    });

    return NextResponse.json({
      reply: extractTextReply(raw),
      session_id: returnedSessionId,
      meeting_attached: Boolean(meetingContext),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
