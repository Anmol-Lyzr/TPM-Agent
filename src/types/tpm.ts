export type DashboardTabId = "plan" | "issues" | "raid" | "mom";

export interface AgentApiRequest {
  message: string;
  session_id?: string;
  mode?: "analyze" | "refine";
  transcript?: string;
}

export interface AgentApiResponse {
  session_id: string;
  payload: import("@/types/meetingPayload").MeetingMinutesPayload | null;
  persisted?: boolean;
  persist_error?: string;
  error?: string;
}
