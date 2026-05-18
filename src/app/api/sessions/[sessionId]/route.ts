import { NextRequest, NextResponse } from "next/server";
import {
  deleteSession,
  getSession,
  upsertSession,
} from "@/lib/db/sessions";
import type { ParsedAgentResponse } from "@/types/tpm";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    if (!sessionId?.trim()) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const includeRaw = req.nextUrl.searchParams.get("includeRaw") === "1";

    const doc = await getSession(sessionId.trim());
    if (!doc) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      sessionId: doc.sessionId,
      parsed: doc.parsed,
      transcript: doc.transcript,
      rawReply: includeRaw ? doc.rawReply : undefined,
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
    const parsed = body.parsed as ParsedAgentResponse | undefined;
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ error: "parsed is required" }, { status: 400 });
    }

    const transcript =
      typeof body.transcript === "string" ? body.transcript : undefined;
    const rawReply =
      typeof body.rawReply === "string" ? body.rawReply : undefined;

    const doc = await upsertSession(sessionId.trim(), {
      parsed,
      transcript,
      rawReply,
    });

    return NextResponse.json({
      sessionId: doc.sessionId,
      parsed: doc.parsed,
      transcript: doc.transcript,
      rawReply: doc.rawReply,
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
