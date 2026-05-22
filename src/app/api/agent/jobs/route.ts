import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { callAgent, createSessionId } from "@/lib/lyzr";
import { extractAgentPayload } from "@/lib/agent/pipeline";
import { upsertSession } from "@/lib/db/sessions";
import { runSessionAtlassianSync } from "@/lib/atlassian/runSessionSync";
import { createJob, updateJobStatus } from "@/lib/db/jobs";

export const runtime = "nodejs";
// 6 minutes: response is instant, but after() keeps the function alive for the agent call
export const maxDuration = 360;

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

    const feedbackText =
      typeof body.feedback_text === "string" ? body.feedback_text.trim() : "";
    const currentPayload = body.current_payload ?? null;

    if (mode === "refine" && (!currentPayload || !feedbackText)) {
      return NextResponse.json(
        { error: "feedback_text and current_payload are required for refine mode" },
        { status: 400 }
      );
    }

    const sessionId =
      (typeof body.session_id === "string" && body.session_id) ||
      createSessionId(activeAgentId);

    const transcript =
      typeof body.transcript === "string" ? body.transcript.trim() || undefined : undefined;

    const job = await createJob({
      mode,
      sessionId,
      message,
      transcript,
      projectName,
      feedbackText: feedbackText || undefined,
      currentPayload,
    });

    // Run the actual agent call after the response is sent
    after(async () => {
      await updateJobStatus(job.jobId, { status: "processing" });
      try {
        const refineMessage =
          mode === "refine"
            ? [
                "You are the Feedback Response Generator Agent.",
                "Use the latest structured meeting payload and user feedback to produce an updated payload using the same schema.",
                "Return only valid JSON in the same schema.",
                `User feedback:\n${feedbackText}`,
                `Current payload:\n${JSON.stringify(currentPayload ?? {}, null, 2)}`,
              ].join("\n\n")
            : message;

        const { sessionId: returnedSessionId, raw } = await callAgent({
          message: refineMessage,
          sessionId,
          apiKey: apiKey!,
          agentId: activeAgentId!,
          userId: userId!,
        });

        const payload = extractAgentPayload(raw);

        let persisted = false;
        let persistError: string | undefined;
        let confluencePageId: string | undefined;
        try {
          const doc = await upsertSession(returnedSessionId, {
            payload,
            transcript,
            projectName,
          });
          confluencePageId = doc.confluencePageId;
          persisted = true;
        } catch (err) {
          persistError = err instanceof Error ? err.message : "DB persist failed";
        }

        const syncTrigger = mode === "refine" ? "agent_refine" : "agent_analyze";
        let atlassianSync: Record<string, unknown> | undefined;
        if (persisted && payload) {
          try {
            atlassianSync = (await runSessionAtlassianSync(
              returnedSessionId,
              payload,
              syncTrigger,
              { confluencePageId }
            )) as unknown as Record<string, unknown>;
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

        await updateJobStatus(job.jobId, {
          status: "completed",
          resultSessionId: returnedSessionId,
          resultPayload: payload,
          persisted,
          persistError,
          atlassianSync,
        });
      } catch (err) {
        await updateJobStatus(job.jobId, {
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    });

    return NextResponse.json({ job_id: job.jobId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
