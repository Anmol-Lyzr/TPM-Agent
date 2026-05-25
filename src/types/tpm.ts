export type DashboardTabId = "plan" | "issues" | "raid" | "mom";

export interface AgentApiRequest {
  message: string;
  session_id?: string;
  mode?: "analyze" | "refine";
  transcript?: string;
  project_name?: string;
  feedback_text?: string;
  current_payload?: import("@/types/meetingPayload").MeetingMinutesPayload | null;
}

export interface AgentApiResponse {
  session_id: string;
  payload: import("@/types/meetingPayload").MeetingMinutesPayload | null;
  persisted?: boolean;
  persist_error?: string;
  atlassian_sync?: import("@/lib/sessionStore").AtlassianSyncSummary;
  error?: string;
}

export interface AgentJobCreateResponse {
  job_id: string;
  error?: string;
}

export type AgentJobStatus = "pending" | "processing" | "completed" | "failed";
export type AgentJobStage =
  | "queued"
  | "calling_lyzr"
  | "parsing_agent_response"
  | "saving_session"
  | "syncing_atlassian"
  | "completed"
  | "failed";

export interface AgentJobStatusResponse {
  job_id: string;
  status: AgentJobStatus;
  stage?: AgentJobStage;
  mode: "analyze" | "refine";
  session_id?: string;
  payload?: import("@/types/meetingPayload").MeetingMinutesPayload | null;
  persisted?: boolean;
  persist_error?: string;
  atlassian_sync?: import("@/lib/sessionStore").AtlassianSyncSummary;
  error?: string;
  created_at?: string;
  updated_at?: string;
}
