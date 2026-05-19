import { NextResponse } from "next/server";
import { listSessions } from "@/lib/db/sessions";

export const runtime = "nodejs";

export async function GET() {
  try {
    const sessions = await listSessions();
    return NextResponse.json({
      sessions: sessions.map((s) => ({
        sessionId: s.sessionId,
        title: s.title,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        hasTranscript: s.hasTranscript,
        planCount: s.planCount,
        issuesCount: s.issuesCount,
        raidCount: s.raidCount,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
