import type { AgentApiResponse, AgentJobCreateResponse, AgentJobStatusResponse } from "@/types/tpm";

export async function postAgent(body: {
  message: string;
  session_id?: string;
  mode?: "analyze" | "refine";
  transcript?: string;
  project_name?: string;
  feedback_text?: string;
  current_payload?: import("@/types/meetingPayload").MeetingMinutesPayload | null;
}): Promise<AgentApiResponse> {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json() as AgentApiResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

export async function postAgentJob(body: {
  message: string;
  session_id?: string;
  mode?: "analyze" | "refine";
  transcript?: string;
  project_name?: string;
  feedback_text?: string;
  current_payload?: import("@/types/meetingPayload").MeetingMinutesPayload | null;
}): Promise<AgentJobCreateResponse> {
  const res = await fetch("/api/agent/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json() as AgentJobCreateResponse;
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

export async function getAgentJobStatus(jobId: string): Promise<AgentJobStatusResponse> {
  const res = await fetch(`/api/agent/jobs/${jobId}`);
  const data = await res.json() as AgentJobStatusResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

/**
 * Polls a job every 1 second until completed/failed or the timeout elapses.
 * Calls onTick on each poll so callers can react to status changes.
 */
export async function pollAgentJob(
  jobId: string,
  options?: {
    intervalMs?: number;
    timeoutMs?: number;
    onTick?: (status: AgentJobStatusResponse) => void;
  }
): Promise<AgentJobStatusResponse> {
  const intervalMs = options?.intervalMs ?? 1000;
  const timeoutMs = options?.timeoutMs ?? 8 * 60 * 1000; // 8 minutes
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const status = await getAgentJobStatus(jobId);
    options?.onTick?.(status);
    if (status.status === "completed" || status.status === "failed") {
      return status;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Job timed out after 8 minutes. Please try again.");
}
