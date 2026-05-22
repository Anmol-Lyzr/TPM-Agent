import { NextRequest, NextResponse } from "next/server";
import { callAgent, createSessionId } from "@/lib/lyzr";
import { extractAgentPayload } from "@/lib/agent/pipeline";
import { upsertSession } from "@/lib/db/sessions";
import { runSessionAtlassianSync } from "@/lib/atlassian/runSessionSync";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.LYZR_API_KEY;
    const analyzeAgentId = process.env.LYZR_AGENT_ID;
    const feedbackAgentId = process.env.LYZR_FEEDBACK_AGENT_ID;
    const userId = process.env.LYZR_USER_ID;
    if (!apiKey || !analyzeAgentId || !userId) {
      return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
    }

    const body = await req.json();
    const mode = body.mode === "refine" ? "refine" : "analyze";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const projectName =
      typeof body.project_name === "string" ? body.project_name.trim() || undefined : undefined;
    if (!message && mode === "analyze") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const activeAgentId = mode === "refine" ? feedbackAgentId : analyzeAgentId;
    if (!activeAgentId) {
      return NextResponse.json(
        { error: "Feedback agent is not configured. Set LYZR_FEEDBACK_AGENT_ID." },
        { status: 500 }
      );
    }

    const refinePayload = body.current_payload;
    const feedbackText =
      typeof body.feedback_text === "string" ? body.feedback_text.trim() : "";
    const refineMessage =
      mode === "refine"
        ? [
            "You are the Feedback Response Generator Agent.",
            "Use the latest structured meeting payload and user feedback to produce an updated payload using the same schema.",
            "Return only valid JSON in the same schema.",
            `User feedback:\n${feedbackText}`,
            `Current payload:\n${JSON.stringify(refinePayload ?? {}, null, 2)}`,
          ].join("\n\n")
        : message;
    if (mode === "refine" && (!refinePayload || !feedbackText)) {
      return NextResponse.json(
        { error: "feedback_text and current_payload are required for refine mode" },
        { status: 400 }
      );
    }

    const sessionId =
      (typeof body.session_id === "string" && body.session_id) ||
      createSessionId(activeAgentId);

    const { sessionId: returnedSessionId, raw } = await callAgent({
      message: refineMessage,
      sessionId,
      apiKey,
      agentId: activeAgentId,
      userId,
    });

    const payload = extractAgentPayload(raw);

    let persisted = false;
    let persistError: string | undefined;
    let confluencePageId: string | undefined;
    try {
      const doc = await upsertSession(returnedSessionId, {
        payload,
        transcript: typeof body.transcript === "string" ? body.transcript.trim() || undefined : undefined,
        projectName,
      });
      confluencePageId = doc.confluencePageId;
      persisted = true;
    } catch (err) {
      persistError = err instanceof Error ? err.message : "DB persist failed";
    }

    const syncTrigger = mode === "refine" ? "agent_refine" : "agent_analyze";
    let atlassianSync;
    if (persisted && payload) {
      try {
        atlassianSync = await runSessionAtlassianSync(returnedSessionId, payload, syncTrigger, {
          confluencePageId,
        });
      } catch (err) {
        atlassianSync = {
          ok: false,
          configured: false,
          skipped: true,
          trigger: syncTrigger,
          jira: { updated: [], failed: [] },
          confluence: {},
          errors: [err instanceof Error ? err.message : "Atlassian sync failed"],
        };
      }
    }

    return NextResponse.json({
      session_id: returnedSessionId,
      payload,
      persisted,
      persist_error: persistError,
      atlassian_sync: atlassianSync,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
