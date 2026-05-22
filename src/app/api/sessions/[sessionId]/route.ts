import { NextRequest, NextResponse } from "next/server";
import {
  deleteSession,
  getSession,
  upsertSession,
} from "@/lib/db/sessions";
import { runSessionAtlassianSync } from "@/lib/atlassian/runSessionSync";
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
      projectName: doc.projectName,
      payload: doc.payload,
      transcript: doc.transcript,
      confluencePageId: doc.confluencePageId,
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
    const projectName =
      typeof body.projectName === "string" ? body.projectName.trim() || undefined : undefined;
    const skipAtlassianSync = body.skipAtlassianSync === true;
    const syncIssueKeys = Array.isArray(body.syncIssueKeys)
      ? body.syncIssueKeys.filter((k: unknown) => typeof k === "string" && k.trim())
      : undefined;

    let doc;
    try {
      doc = await upsertSession(sessionId.trim(), {
        payload: payload ?? null,
        transcript,
        projectName,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    let atlassianSync;
    if (payload && !skipAtlassianSync) {
      try {
        atlassianSync = await runSessionAtlassianSync(sessionId.trim(), payload, "user_edit", {
          confluencePageId: doc.confluencePageId,
          syncIssueKeys,
          skipConfluence: Boolean(syncIssueKeys?.length),
        });
      } catch (err) {
        atlassianSync = {
          ok: false,
          configured: false,
          skipped: true,
          trigger: "user_edit" as const,
          jira: { updated: [], failed: [] },
          confluence: {},
          errors: [err instanceof Error ? err.message : "Atlassian sync failed"],
        };
      }
    }

    const latest = await getSession(sessionId.trim());

    return NextResponse.json({
      sessionId: doc.sessionId,
      projectName: latest?.projectName ?? doc.projectName,
      payload: latest?.payload ?? doc.payload,
      transcript: latest?.transcript ?? doc.transcript,
      confluencePageId: latest?.confluencePageId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      atlassian_sync: atlassianSync,
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
