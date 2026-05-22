import type { AgentApiResponse } from "@/types/tpm";

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
