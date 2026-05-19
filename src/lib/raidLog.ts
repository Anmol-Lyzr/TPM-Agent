import type {
  JiraIssueRow,
  ParsedAgentResponse,
  RaidCategory,
  RaidLogRow,
} from "@/types/legacyTpm";

export const RAID_CATEGORIES: RaidCategory[] = [
  "Risk",
  "Assumption",
  "Issue",
  "Dependency",
];

const CATEGORY_ALIASES: Record<string, RaidCategory> = {
  risk: "Risk",
  risks: "Risk",
  assumption: "Assumption",
  assumptions: "Assumption",
  issue: "Issue",
  issues: "Issue",
  dependency: "Dependency",
  dependencies: "Dependency",
  depend: "Dependency",
  blocker: "Issue",
  blockers: "Issue",
};

export function normalizeRaidCategory(input: string): RaidCategory | null {
  const key = input.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!key) return null;
  if (CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key];
  for (const cat of RAID_CATEGORIES) {
    if (key === cat.toLowerCase()) return cat;
  }
  if (key.includes("risk")) return "Risk";
  if (key.includes("assumpt")) return "Assumption";
  if (key.includes("depend")) return "Dependency";
  if (key.includes("issue") || key.includes("blocker")) return "Issue";
  return null;
}

export function createRaidRow(
  category: RaidCategory,
  partial?: Partial<RaidLogRow>
): RaidLogRow {
  return {
    id: partial?.id ?? newRaidId(),
    category,
    description: partial?.description ?? "",
    owner: partial?.owner ?? "",
    impact: partial?.impact ?? "",
    probability: partial?.probability ?? "",
    status: partial?.status ?? "Open",
    mitigation: partial?.mitigation ?? "",
    targetDate: partial?.targetDate ?? "",
    notes: partial?.notes ?? "",
  };
}

export function newRaidId(): string {
  return `raid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeRaidRow(row: Partial<RaidLogRow>): RaidLogRow {
  const category =
    row.category && RAID_CATEGORIES.includes(row.category)
      ? row.category
      : normalizeRaidCategory(String(row.category ?? "")) ?? "Issue";

  const status = normalizeRaidStatus(row.status);

  return {
    id: row.id?.trim() || newRaidId(),
    category,
    description: String(row.description ?? "").trim(),
    owner: String(row.owner ?? "").trim(),
    impact: String(row.impact ?? "").trim(),
    probability: String(row.probability ?? "").trim(),
    status,
    mitigation: String(row.mitigation ?? "").trim(),
    targetDate: String(row.targetDate ?? "").trim(),
    notes: String(row.notes ?? "").trim(),
  };
}

function normalizeRaidStatus(
  status: string | undefined
): RaidLogRow["status"] {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "closed" || s === "done" || s === "resolved") return "Closed";
  if (s === "mitigating" || s === "in progress" || s === "active")
    return "Mitigating";
  if (s === "accepted" || s === "monitoring") return "Accepted";
  return "Open";
}

export function formatRaidLogMarkdown(rows: RaidLogRow[]): string {
  if (rows.length === 0) return "";
  const header =
    "| Type | Description | Owner | Impact | Probability | Status | Mitigation | Target date |";
  const sep = "| --- | --- | --- | --- | --- | --- | --- | --- |";
  const body = rows.map(
    (r) =>
      `| ${r.category} | ${r.description} | ${r.owner} | ${r.impact} | ${r.probability} | ${r.status} | ${r.mitigation} | ${r.targetDate} |`
  );
  return [header, sep, ...body].join("\n");
}

function raidDedupeKey(row: RaidLogRow): string {
  const jiraKey = row.description.match(/\b([A-Z][A-Z0-9]+-\d+)\b/)?.[1];
  if (jiraKey) return `${row.category}::${jiraKey}`;
  return `${row.category}::${row.description.toLowerCase()}`;
}

function dedupeRaidRows(rows: RaidLogRow[]): RaidLogRow[] {
  const seen = new Set<string>();
  const out: RaidLogRow[] = [];
  for (const row of rows) {
    const key = raidDedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function mapJiraStatusToRaid(status?: string): RaidLogRow["status"] {
  const s = (status ?? "").toLowerCase();
  if (/done|closed|resolved/.test(s)) return "Closed";
  if (/progress|mitigat/.test(s)) return "Mitigating";
  return "Open";
}

function isHighSeverityDefect(issue: JiraIssueRow): boolean {
  if (/critical|high/i.test(issue.priority ?? "")) return true;
  if (
    /production|security|regression|escalat|overdue|api\s*500|timeout|oauth/i.test(
      `${issue.summary} ${issue.status ?? ""}`
    )
  ) {
    return true;
  }
  return false;
}

export function raidRowsFromJiraBugs(issues: JiraIssueRow[]): RaidLogRow[] {
  const rows: RaidLogRow[] = [];

  for (const issue of issues) {
    const isBug =
      /bug/i.test(issue.issueType ?? "") ||
      /bug|defect/i.test(issue.summary);
    if (!isBug) continue;

    const description = `${issue.key}: ${issue.summary}`;
    const base = {
      description,
      owner: issue.assignee ?? "",
      impact: issue.priority ?? "",
      probability: "",
      status: mapJiraStatusToRaid(issue.status),
      mitigation: "",
      targetDate: issue.dueDate ?? "",
    };

    if (isHighSeverityDefect(issue)) {
      rows.push(
        normalizeRaidRow({ ...base, category: "Risk", notes: "High-severity defect" })
      );
    }

    rows.push(
      normalizeRaidRow({ ...base, category: "Issue", notes: "Defect from bug triage" })
    );
  }

  return rows;
}

export function ensureRaidLogIds(rows: RaidLogRow[]): RaidLogRow[] {
  return rows.map((r) => (r.id ? r : { ...r, id: newRaidId() }));
}

/** Merge JIRA-bug-derived RAID rows into the parsed agent output. */
export function enrichParsedRaid(
  parsed: ParsedAgentResponse,
  _transcript?: string
): ParsedAgentResponse {
  if (parsed.issues.length === 0) return parsed;

  const extra = raidRowsFromJiraBugs(parsed.issues);
  if (extra.length === 0) return parsed;

  const merged = dedupeRaidRows([...parsed.raidLog, ...extra]);
  if (merged.length === parsed.raidLog.length) return parsed;

  return {
    ...parsed,
    raidLog: ensureRaidLogIds(merged),
  };
}
