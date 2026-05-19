import type { JiraIssueRow } from "@/types/legacyTpm";

const JIRA_KEY = /\b([A-Z][A-Z0-9]+-\d+)\b/;

/** Lines like: Bug SCRUM-201 "Summary text." Status Open. Priority High. Assignee Name. Due 22 May 2026. */
const BUG_LINE =
  /Bug\s+([A-Z][A-Z0-9]+-\d+)\s+"([^"]+)"(?:\s*\.?)\s*(.*)$/i;

function parseBugLineTail(tail: string): Pick<
  JiraIssueRow,
  "status" | "priority" | "assignee" | "dueDate"
> {
  const status = tail.match(/\bStatus\s+([^.,]+)/i)?.[1]?.trim();
  const priority = tail.match(/\bPriority\s+(\w+)/i)?.[1]?.trim();
  let assignee = tail.match(/\bAssignee\s+([^.,]+?)(?:\s*\.|,|\s+Due\b)/i)?.[1]?.trim();
  if (assignee?.toLowerCase() === "unassigned") assignee = "";
  const dueDate = tail.match(/\bDue\s+(.+?)(?:\.|$)/i)?.[1]?.trim();
  return { status, priority, assignee, dueDate };
}

/** Pull Bug-type Jira rows from meeting transcript (bug triage format). */
export function extractJiraIssuesFromTranscript(text: string): JiraIssueRow[] {
  const issues: JiraIssueRow[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/^\[\d{1,2}:\d{2}(?::\d{2})?\]\s*[^|\n]*\|?\s*/i, "").trim();
    const m = line.match(BUG_LINE);
    if (!m) continue;

    const key = m[1];
    if (seen.has(key)) continue;
    seen.add(key);

    const tail = parseBugLineTail(m[3] ?? "");
    issues.push({
      key,
      summary: m[2].trim(),
      action: "unknown",
      issueType: "Bug",
      status: tail.status,
      assignee: tail.assignee,
      dueDate: tail.dueDate,
      priority: tail.priority,
    });
  }

  return issues;
}

export function mergeJiraIssues(
  fromAgent: JiraIssueRow[],
  fromTranscript: JiraIssueRow[]
): JiraIssueRow[] {
  const byKey = new Map<string, JiraIssueRow>();
  for (const row of fromAgent) {
    byKey.set(row.key, row);
  }
  for (const row of fromTranscript) {
    const existing = byKey.get(row.key);
    if (!existing) {
      byKey.set(row.key, row);
      continue;
    }
    if (!existing.issueType && row.issueType) {
      byKey.set(row.key, { ...existing, issueType: row.issueType });
    }
  }
  return [...byKey.values()];
}

/** Count keys mentioned as bugs in recap lines (fallback). */
export function extractBugKeysFromRecap(text: string): string[] {
  const keys = new Set<string>();
  for (const line of text.split("\n")) {
    if (!/bug|defect|excel import|jira/i.test(line)) continue;
    for (const m of line.matchAll(new RegExp(JIRA_KEY, "g"))) {
      keys.add(m[1]);
    }
  }
  return [...keys];
}
