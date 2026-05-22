import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/db/jobs";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { jobId } = await context.params;
    if (!jobId?.trim()) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const job = await getJob(jobId.trim());
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      job_id: job.jobId,
      status: job.status,
      mode: job.mode,
      session_id: job.resultSessionId,
      payload: job.resultPayload,
      persisted: job.persisted,
      persist_error: job.persistError,
      atlassian_sync: job.atlassianSync,
      error: job.error,
      created_at: job.createdAt,
      updated_at: job.updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
