import type { JiraIssue } from "@/lib/atlassianClient";
import type { IssueTrackerEntry } from "@/types/meetingPayload";
import type { CallToActionEntry } from "@/types/meetingPayload";
import type { CtaJiraAction, JiraActionStepResult } from "@/types/jiraActions";

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function issueKeysMatch(a?: string, b?: string): boolean {
  const left = a?.trim().toUpperCase();
  const right = b?.trim().toUpperCase();
  return Boolean(left && right && left === right);
}

function isSyntheticAgentKey(key: string): boolean {
  return /^[A-Z][A-Z0-9]*-\d+$/i.test(key.trim()) && !/^HM-\d+$/i.test(key.trim());
}

function summaryReferencesKey(summary: string | undefined, key: string | undefined): boolean {
  if (!summary?.trim() || !key?.trim()) return false;
  const marker = key.trim().toLowerCase();
  const normalized = normalizeText(summary);
  return (
    normalized.includes(`[${marker}]`) ||
    normalized.includes(marker) ||
    normalized.includes(marker.replace(/-/g, ""))
  );
}

/** Collapse duplicate rows (e.g. HMC-403 + HM-22) into one tracker entry. */
export function consolidateIssueTracker(entries: IssueTrackerEntry[]): IssueTrackerEntry[] {
  if (entries.length < 2) return entries;

  const merged: IssueTrackerEntry[] = [];
  const used = new Set<number>();

  for (let i = 0; i < entries.length; i++) {
    if (used.has(i)) continue;
    let row = { ...entries[i] };

    for (let j = i + 1; j < entries.length; j++) {
      if (used.has(j)) continue;
      const other = entries[j];
      const sameKey = issueKeysMatch(row.issue_key, other.issue_key);
      const rowRefsOther =
        summaryReferencesKey(row.summary, other.issue_key) ||
        summaryReferencesKey(other.summary, row.issue_key);
      const linkedSynthetic =
        (row.issue_key && other.issue_key && isSyntheticAgentKey(row.issue_key) !== isSyntheticAgentKey(other.issue_key) &&
          (summaryReferencesKey(row.summary, other.issue_key) ||
            summaryReferencesKey(other.summary, row.issue_key) ||
            normalizeText(row.summary) === normalizeText(other.summary)));

      if (!sameKey && !rowRefsOther && !linkedSynthetic) continue;

      used.add(j);
      const preferRealKey = (key?: string) =>
        key && /^HM-\d+$/i.test(key) ? key : undefined;
      const realKey = preferRealKey(row.issue_key) ?? preferRealKey(other.issue_key) ?? row.issue_key;

      row = {
        ...row,
        ...other,
        issue_key: realKey || row.issue_key || other.issue_key,
        summary: row.summary?.trim() || other.summary || "",
        description:
          (row.description?.length ?? 0) >= (other.description?.length ?? 0)
            ? row.description
            : other.description,
        assignee: row.assignee?.trim() || other.assignee || "",
        status: row.status || other.status,
        priority: row.priority || other.priority,
      };
    }

    merged.push(row);
    used.add(i);
  }

  return merged;
}

function findMatchingJiraIssue(
  row: IssueTrackerEntry,
  jiraIssues: JiraIssue[]
): JiraIssue | undefined {
  const rowKey = row.issue_key?.trim().toUpperCase();
  if (rowKey) {
    const direct = jiraIssues.find((j) => issueKeysMatch(j.key, rowKey));
    if (direct) return direct;
  }

  for (const jira of jiraIssues) {
    if (summaryReferencesKey(jira.fields?.summary, row.issue_key)) return jira;
    if (normalizeText(jira.fields?.summary) === normalizeText(row.summary)) return jira;
  }

  return undefined;
}

function toIssueType(value: string | undefined): IssueTrackerEntry["issue_type"] {
  if (value === "Bug" || value === "Story" || value === "Task" || value === "Epic") return value;
  return "Task";
}

function toIssueStatus(value: string | undefined): IssueTrackerEntry["status"] {
  if (
    value === "Open" ||
    value === "To Do" ||
    value === "In Progress" ||
    value === "Done" ||
    value === "Blocked" ||
    value === "Resolved" ||
    value === "Closed"
  ) {
    return value;
  }
  const normalized = normalizeText(value);
  if (normalized.includes("progress")) return "In Progress";
  if (normalized.includes("done")) return "Done";
  if (normalized.includes("closed")) return "Closed";
  if (normalized.includes("resolved")) return "Resolved";
  if (normalized.includes("block")) return "Blocked";
  if (normalized.includes("to do") || normalized.includes("todo") || normalized.includes("backlog")) {
    return "To Do";
  }
  return "Open";
}

function toIssuePriority(value: string | undefined): IssueTrackerEntry["priority"] {
  if (value === "Low" || value === "Medium" || value === "High" || value === "Critical") return value;
  const normalized = normalizeText(value);
  if (normalized.includes("highest") || normalized.includes("critical")) return "Critical";
  if (normalized.includes("high")) return "High";
  if (normalized.includes("low")) return "Low";
  return "Medium";
}

function overlayJiraOnGenerated(
  generated: IssueTrackerEntry,
  jira: JiraIssue
): IssueTrackerEntry {
  const summary = jira.fields?.summary?.trim() ?? "";
  const priority = toIssuePriority(jira.fields?.priority?.name ?? generated.priority);
  return {
    ...generated,
    issue_key: jira.key?.trim() || generated.issue_key,
    issue_type: toIssueType(jira.fields?.issuetype?.name ?? generated.issue_type),
    summary: summary || generated.summary,
    priority,
    status: toIssueStatus(jira.fields?.status?.name ?? generated.status),
    assignee: jira.fields?.assignee?.displayName?.trim() || generated.assignee,
    severity: generated.severity || priority,
  };
}

function jiraOnlyRow(jira: JiraIssue, generatedIssues: IssueTrackerEntry[]): IssueTrackerEntry {
  const summary = jira.fields?.summary?.trim() ?? "";
  const generated = generatedIssues.find(
    (row) =>
      issueKeysMatch(row.issue_key, jira.key) ||
      normalizeText(row.summary) === normalizeText(summary) ||
      summaryReferencesKey(summary, row.issue_key)
  );
  const priority = toIssuePriority(jira.fields?.priority?.name ?? generated?.priority);
  return {
    issue_key: jira.key,
    issue_type: toIssueType(jira.fields?.issuetype?.name ?? generated?.issue_type),
    summary: summary || generated?.summary || "Untitled Jira issue",
    description: generated?.description ?? "",
    priority,
    status: toIssueStatus(jira.fields?.status?.name ?? generated?.status),
    assignee: jira.fields?.assignee?.displayName ?? generated?.assignee ?? "",
    reporter: generated?.reporter ?? "",
    sprint: generated?.sprint ?? "",
    epic: generated?.epic ?? "",
    labels: generated?.labels ?? [],
    story_points: generated?.story_points ?? 0,
    blocked_by: generated?.blocked_by ?? [],
    due_date: generated?.due_date ?? "",
    acceptance_criteria: generated?.acceptance_criteria ?? [],
    severity: generated?.severity ?? priority,
    module: generated?.module ?? "",
    root_cause: generated?.root_cause ?? "",
    steps_to_reproduce: generated?.steps_to_reproduce ?? [],
    impact: generated?.impact ?? "",
    workaround: generated?.workaround ?? "",
    resolution_plan: generated?.resolution_plan ?? "",
    date_opened: generated?.date_opened ?? "",
    date_resolved: generated?.date_resolved ?? null,
  };
}

/**
 * Payload issue_tracker is source of truth for rich fields (comments, RAID context).
 * Jira provides live status, assignee, and keys.
 */
export function mergeIssueTrackerWithJira(
  generatedIssues: IssueTrackerEntry[],
  jiraIssues: JiraIssue[]
): IssueTrackerEntry[] {
  const base = consolidateIssueTracker(generatedIssues);
  if (!jiraIssues.length) return base;

  const usedJiraKeys = new Set<string>();
  const rows: IssueTrackerEntry[] = [];

  for (const generated of base) {
    const jira = findMatchingJiraIssue(generated, jiraIssues);
    if (jira?.key) {
      usedJiraKeys.add(jira.key);
      rows.push(overlayJiraOnGenerated(generated, jira));
    } else {
      rows.push(generated);
    }
  }

  for (const jira of jiraIssues) {
    const key = jira.key?.trim();
    if (!key || usedJiraKeys.has(key)) continue;
    usedJiraKeys.add(key);
    rows.push(jiraOnlyRow(jira, base));
  }

  return rows;
}

export function resolveTrackerIndexForCta(
  tracker: IssueTrackerEntry[],
  action: CtaJiraAction,
  step: JiraActionStepResult,
  cta: CallToActionEntry
): number {
  const lookupKeys = [
    cta.related_entity?.entity_id,
    action.issue_key,
    step.issue_key,
  ].filter((k): k is string => Boolean(k?.trim()));

  for (const key of lookupKeys) {
    const idx = tracker.findIndex((row) => {
      if (issueKeysMatch(row.issue_key, key)) return true;
      if (summaryReferencesKey(row.summary, key)) return true;
      return false;
    });
    if (idx >= 0) return idx;
  }

  const summaryHint = action.fields?.summary?.trim();
  if (summaryHint) {
    const idx = tracker.findIndex(
      (row) => normalizeText(row.summary) === normalizeText(summaryHint)
    );
    if (idx >= 0) return idx;
  }

  return -1;
}
