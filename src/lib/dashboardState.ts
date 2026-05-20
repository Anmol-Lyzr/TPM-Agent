import type { DashboardTabId } from "@/types/tpm";
import type { MeetingMinutesPayload } from "@/types/meetingPayload";

export const DASHBOARD_TABS: { key: DashboardTabId; label: string }[] = [
  { key: "plan", label: "Project Plan" },
  { key: "issues", label: "Issue Tracker" },
  { key: "raid", label: "RAID Log" },
  { key: "mom", label: "Minutes of Meeting" },
];

export function getTabSnapshot(payload: MeetingMinutesPayload | null, tab: DashboardTabId): unknown {
  if (!payload) return null;
  switch (tab) {
    case "plan": return payload.project_plan;
    case "issues": return payload.issue_tracker;
    case "raid": return payload.raid_log;
    case "mom": return payload.minutes_of_meeting;
  }
}

export function cloneTabSnapshot<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}
