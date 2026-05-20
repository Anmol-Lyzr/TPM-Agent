import { NextRequest, NextResponse } from "next/server";
import {
  deleteSession,
  getSession,
  upsertSession,
} from "@/lib/db/sessions";
import type { MeetingMinutesPayload } from "@/types/meetingPayload";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    if (!sessionId?.trim()) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const doc = await getSession(sessionId.trim());
    if (!doc) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      sessionId: doc.sessionId,
      payload: doc.payload,
      transcript: doc.transcript,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    if (!sessionId?.trim()) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const body = await req.json();
    const payload = body.payload as MeetingMinutesPayload | null | undefined;

    const transcript =
      typeof body.transcript === "string" ? body.transcript : undefined;

    let doc;
    try {
      doc = await upsertSession(sessionId.trim(), {
        payload: payload ?? null,
        transcript,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({
      sessionId: doc.sessionId,
      payload: doc.payload,
      transcript: doc.transcript,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    if (!sessionId?.trim()) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    await deleteSession(sessionId.trim());
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
