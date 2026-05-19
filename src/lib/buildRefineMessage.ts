import type { DashboardTabId } from "@/types/tpm";
import { DASHBOARD_TABS } from "@/lib/dashboardState";

const TAB_LABELS: Record<DashboardTabId, string> = Object.fromEntries(
  DASHBOARD_TABS.map((t) => [t.key, t.label])
) as Record<DashboardTabId, string>;

export function buildRefineMessage(
  activeTab: DashboardTabId,
  snapshot: unknown,
  userInstruction: string
): string {
  const snapshotText =
    typeof snapshot === "string"
      ? snapshot
      : JSON.stringify(snapshot, null, 2);

  return `REFINEMENT REQUEST — apply only the requested changes.

Active tab: ${TAB_LABELS[activeTab]}

Current snapshot:
${snapshotText}

User instruction:
"${userInstruction.trim()}"

Return the FULL standard TPM output with all four sections:
1. Confluence — Meeting summary
2. JIRA — Task list (Excel import)
3. Smartsheet — Project plan WBS table with columns: WBS ID | Task Name | Task Description | Owner / Resource | Start Date | End Date | Duration (Days) | Dependency (WBS ID) | Status | Priority | Comments / Notes. Use milestone rows with WBS IDs M1, M2, … and Task Name "MILESTONE: …"; indent sub-tasks in Task Name (e.g. "    Requirements Gathering"); include WBS IDs like 1.1, 1.1.1 for work items.
4. RAID — RAID log table (Type: Risk | Assumption | Issue | Dependency; columns for Description, Owner, Impact, Probability, Status, Mitigation, Target date)

Keep unchanged content identical unless the user instruction requires a change.
The RAID log is separate from the project plan and Jira issue tracker — do not duplicate schedule rows as RAID entries unless they are true risks, assumptions, issues, or dependencies.
Do not re-run external Jira or Confluence tools unless the user explicitly asks to sync to Jira or Confluence.`;
}
