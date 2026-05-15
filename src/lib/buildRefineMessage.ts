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

Return the FULL standard TPM output with all three sections:
1. Confluence — Meeting summary
2. JIRA — Task list (Excel import)
3. Smartsheet — Project plan

Keep unchanged content identical unless the user instruction requires a change.
Do not re-run external Jira or Confluence tools unless the user explicitly asks to sync to Jira or Confluence.`;
}
