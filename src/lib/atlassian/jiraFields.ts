import { searchJiraUsers } from "@/lib/atlassian/client";

const JIRA_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/i;

export function isValidJiraIssueKey(issueKey: string): boolean {
  return JIRA_KEY_PATTERN.test(issueKey.trim());
}
import { textToAdf } from "@/lib/atlassian/jiraAdf";
import type { IssueTrackerEntry } from "@/types/meetingPayload";

function fieldHasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return value > 0;
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

const accountIdCache = new Map<string, string>();

export async function resolveJiraAccountId(displayName: string): Promise<string> {
  const key = displayName.trim().toLowerCase();
  if (!key) throw new Error("Assignee name is required");
  const cached = accountIdCache.get(key);
  if (cached) return cached;

  const { users } = await searchJiraUsers(displayName.trim());
  let accountId = users?.find((user) => user.displayName?.trim().toLowerCase() === key)?.accountId;
  accountId ??= users?.[0]?.accountId;
  if (!accountId) {
    const allUsers = await searchJiraUsers();
    accountId = allUsers.users?.find((user) => user.displayName?.trim().toLowerCase() === key)?.accountId;
  }
  if (!accountId) throw new Error(`Jira user not found: ${displayName}`);
  accountIdCache.set(key, accountId);
  return accountId;
}

export async function buildJiraUpdateFields(
  issue: IssueTrackerEntry
): Promise<Record<string, unknown>> {
  const fields: Record<string, unknown> = {};
  if (issue.summary?.trim()) fields.summary = issue.summary.trim();

  const descriptionParts = [
    issue.description?.trim(),
    issue.impact?.trim() ? `Impact: ${issue.impact.trim()}` : "",
    issue.resolution_plan?.trim() ? `Resolution plan: ${issue.resolution_plan.trim()}` : "",
    issue.workaround?.trim() ? `Workaround: ${issue.workaround.trim()}` : "",
    issue.acceptance_criteria?.length
      ? `Acceptance criteria:\n${issue.acceptance_criteria.map((c) => `- ${c}`).join("\n")}`
      : "",
  ].filter(Boolean);

  if (descriptionParts.length) {
    fields.description = textToAdf(descriptionParts.join("\n\n"));
  }

  if (issue.priority) fields.priority = { name: issue.priority };
  if (issue.assignee?.trim()) {
    try {
      fields.assignee = { accountId: await resolveJiraAccountId(issue.assignee) };
    } catch (err) {
      console.warn(
        `[jira-sync] skipping assignee update for "${issue.assignee}": ${
          err instanceof Error ? err.message : "Jira user lookup failed"
        }`
      );
    }
  }

  return fields;
}

export function issueHasSyncableFields(issue: IssueTrackerEntry): boolean {
  return (
    fieldHasValue(issue.summary) ||
    fieldHasValue(issue.description) ||
    fieldHasValue(issue.priority) ||
    fieldHasValue(issue.assignee) ||
    fieldHasValue(issue.impact) ||
    fieldHasValue(issue.resolution_plan) ||
    fieldHasValue(issue.workaround) ||
    (issue.acceptance_criteria?.length ?? 0) > 0 ||
    fieldHasValue(issue.status)
  );
}
