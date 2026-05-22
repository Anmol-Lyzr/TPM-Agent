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
