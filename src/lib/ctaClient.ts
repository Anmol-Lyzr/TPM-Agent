import type { CallToActionEntry } from "@/types/meetingPayload";
import type { ExecuteJiraActionsResult } from "@/types/jiraActions";

export async function executeCtaJiraActionsForCta(
  cta: CallToActionEntry
): Promise<ExecuteJiraActionsResult & { skipped?: boolean; error?: string }> {
  const res = await fetch("/api/cta/jira-actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cta }),
  });
  const data = (await res.json()) as ExecuteJiraActionsResult & {
    skipped?: boolean;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? data.errors?.[0] ?? `Jira execution failed (${res.status})`);
  }
  return data;
}
