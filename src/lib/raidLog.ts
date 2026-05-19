import type {
  JiraIssueRow,
  MeetingMinutes,
  ParsedAgentResponse,
  RaidCategory,
  RaidLogRow,
} from "@/types/tpm";

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

/** Map free-text labels to a RAID category (business rule). */
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

/** Normalize persisted or agent rows to canonical RAID shape. */
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

function parseMarkdownTable(tableText: string): string[][] {
  const lines = tableText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && l.endsWith("|"));

  if (lines.length < 2) return [];

  const parseRow = (line: string) =>
    line
      .slice(1, -1)
      .split("|")
      .map((c) => c.trim());

  const rows: string[][] = [];
  for (const line of lines) {
    if (/^\|[\s\-:|]+\|$/.test(line)) continue;
    rows.push(parseRow(line));
  }
  return rows;
}

function headerIndex(headers: string[], patterns: string[]): number {
  return headers.findIndex((h) =>
    patterns.some((p) => h.includes(p) || h === p)
  );
}

/** Parse a dedicated RAID markdown table (type column required). */
export function parseRaidTable(raidText: string): RaidLogRow[] {
  if (!raidText.trim()) return [];

  const tableRows = parseMarkdownTable(raidText);
  if (tableRows.length < 2) return [];

  const headers = tableRows[0].map((h) => h.toLowerCase());
  const typeIdx = headerIndex(headers, [
    "type",
    "category",
    "raid",
    "raid type",
  ]);
  const descIdx = headerIndex(headers, [
    "description",
    "desc",
    "item",
    "summary",
    "detail",
  ]);
  const ownerIdx = headerIndex(headers, ["owner", "assigned", "assignee"]);
  const impactIdx = headerIndex(headers, ["impact", "severity"]);
  const probIdx = headerIndex(headers, ["probability", "likelihood", "prob"]);
  const statusIdx = headerIndex(headers, ["status"]);
  const mitIdx = headerIndex(headers, [
    "mitigation",
    "action",
    "response",
    "plan",
  ]);
  const dateIdx = headerIndex(headers, ["date", "target", "due"]);
  const notesIdx = headerIndex(headers, ["notes", "comment"]);

  const entries: RaidLogRow[] = [];

  for (let i = 1; i < tableRows.length; i++) {
    const row = tableRows[i];
    const typeRaw = typeIdx >= 0 ? row[typeIdx] : row[0] ?? "";
    const category = normalizeRaidCategory(typeRaw);
    if (!category) continue;

    const description =
      (descIdx >= 0 ? row[descIdx] : row[1] ?? "").trim() ||
      typeRaw.trim();
    if (!description) continue;

    entries.push(
      normalizeRaidRow({
        category,
        description,
        owner: ownerIdx >= 0 ? row[ownerIdx] : "",
        impact: impactIdx >= 0 ? row[impactIdx] : "",
        probability: probIdx >= 0 ? row[probIdx] : "",
        status:
          statusIdx >= 0
            ? normalizeRaidStatus(row[statusIdx])
            : "Open",
        mitigation: mitIdx >= 0 ? row[mitIdx] : "",
        targetDate: dateIdx >= 0 ? row[dateIdx] : "",
        notes: notesIdx >= 0 ? row[notesIdx] : "",
      })
    );
  }

  return entries;
}

/** MoM subsection headers that are not RAID categories. */
const NON_RAID_SECTION =
  /^(?:#{1,4}\s*)?(?:\d+\.\s*)?(summary|decisions?|action\s*items?|attendees?|date\b|meeting\s*notes?)\b/i;

const RAID_SECTION_HEADING =
  /^(?:#{1,4}\s*)?(?:\d+\.\s*)?(risks?(?:\s*\/\s*blockers?)?|assumptions?|dependencies?|raid(?:\s*log)?|issues?(?:\s*\/\s*blockers?)?)\b/i;

function categoryFromSectionHeading(line: string): RaidCategory | null {
  const m = line.match(RAID_SECTION_HEADING);
  if (!m) return null;
  return normalizeRaidCategory(m[1]);
}

function parseListItem(line: string): string | null {
  const trimmed = line.trim();
  const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
  if (bullet) return bullet[1].trim();
  const numbered = trimmed.match(/^\d+\.\s+(.+)$/);
  if (numbered) return numbered[1].trim();
  return null;
}

/**
 * Pull bullet/numbered lines under a Confluence subsection (e.g. "Risks / blockers").
 */
const NEXT_SUBSECTION =
  /^(?:#{1,4}\s*)?(?:\d+\.\s*)?(risks?(?:\s*\/\s*blockers?)?|assumptions?|dependencies?|issues?(?:\s*\/\s*blockers?)?|open questions?|summary|decisions?|action\s*items?|attendees?|date\b|meeting\s*notes?|raid(?:\s*log)?)\b/i;

export function extractBulletsUnderHeader(
  text: string,
  headerPattern: RegExp
): string[] {
  const items: string[] = [];
  let inSection = false;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (headerPattern.test(trimmed)) {
      inSection = true;
      continue;
    }

    if (inSection && NEXT_SUBSECTION.test(trimmed) && !headerPattern.test(trimmed)) {
      inSection = false;
      continue;
    }

    if (!inSection) continue;

    const item = parseListItem(line);
    if (item) items.push(item);
  }

  return items;
}

/** Parse MoM-style RAID-related lists from Confluence text. */
export function parseConfluenceRaidLists(text: string): {
  risks: string[];
  assumptions: string[];
  issues: string[];
  dependencies: string[];
  openQuestions: string[];
} {
  return {
    risks: extractBulletsUnderHeader(text, /^risks?(?:\s*\/\s*blockers?)?\b/i),
    assumptions: extractBulletsUnderHeader(text, /^assumptions?\b/i),
    issues: extractBulletsUnderHeader(
      text,
      /^issues?(?:\s*\/\s*blockers?)?\b/i
    ),
    dependencies: extractBulletsUnderHeader(text, /^dependencies?\b/i),
    openQuestions: extractBulletsUnderHeader(text, /^open questions?\b/i),
  };
}

function rowsFromDescriptions(
  category: RaidCategory,
  items: string[],
  notes?: string
): RaidLogRow[] {
  return items
    .filter((d) => d.trim())
    .map((description) =>
      normalizeRaidRow({
        category,
        description: description.trim(),
        status: "Open",
        notes: notes ?? "",
      })
    );
}

/** Extract bullet items only under explicit RAID subsection headings. */
export function extractRaidFromNarrative(text: string): RaidLogRow[] {
  const entries: RaidLogRow[] = [];
  let currentCategory: RaidCategory | null = null;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (NON_RAID_SECTION.test(trimmed)) {
      currentCategory = null;
      continue;
    }

    const raidHeading = categoryFromSectionHeading(trimmed);
    if (raidHeading) {
      currentCategory = raidHeading;
      continue;
    }

    const item = parseListItem(line);
    if (!item || !currentCategory) continue;

    entries.push(
      normalizeRaidRow({
        category: currentCategory,
        description: item,
        status: "Open",
      })
    );
  }

  return entries;
}

function raidRowsFromMomLists(minutes: MeetingMinutes): RaidLogRow[] {
  return [
    ...rowsFromDescriptions("Risk", minutes.risks, "MoM — risks / blockers"),
    ...rowsFromDescriptions(
      "Assumption",
      minutes.openQuestions,
      "MoM — open question"
    ),
  ];
}

/** Build markdown for agent RAID section fallback (exports / display). */
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

/** Map Jira Bug rows to RAID Issues (and Risks for severe defects). */
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
        normalizeRaidRow({
          ...base,
          category: "Risk",
          notes: "High-severity defect",
        })
      );
    }

    rows.push(
      normalizeRaidRow({
        ...base,
        category: "Issue",
        notes: "Defect from bug triage",
      })
    );
  }

  return rows;
}

/** Strip Teams-style timestamp / speaker prefix from a transcript line. */
function stripTranscriptLinePrefix(line: string): string {
  let s = line.trim();
  s = s.replace(/^\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/i, "");
  const speaker = s.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+):\s+/);
  if (speaker) s = s.slice(speaker[0].length);
  return s.trim();
}

/** Split inline "Risks: A. B. C." paragraphs into separate RAID items. */
function splitInlineRaidSentences(body: string): string[] {
  const trimmed = body.trim();
  if (!trimmed) return [];
  const parts = trimmed
    .split(/\.\s+(?=(?:SCRUM-|PHX-|Excel|[A-Z][a-z]{2,}))/g)
    .map((s) => s.trim().replace(/\.\s*$/, ""))
    .filter((s) => s.length > 8);
  return parts.length > 0 ? parts : [trimmed];
}

function extractInlineLabelLines(
  text: string,
  labelRe: RegExp,
  category: RaidCategory,
  notes: string
): RaidLogRow[] {
  const rows: RaidLogRow[] = [];
  for (const rawLine of text.split("\n")) {
    const line = stripTranscriptLinePrefix(rawLine);
    const m = line.match(labelRe);
    if (!m?.[1]) continue;
    for (const desc of splitInlineRaidSentences(m[1])) {
      rows.push(
        normalizeRaidRow({
          category,
          description: desc,
          status: "Open",
          notes,
        })
      );
    }
  }
  return rows;
}

/** Extract RAID items from raw meeting transcript or inline MoM text. */
export function extractRaidFromTranscript(text: string): RaidLogRow[] {
  if (!text.trim()) return [];

  const lists = parseConfluenceRaidLists(text);
  const fromLists = [
    ...rowsFromDescriptions("Risk", lists.risks, "Transcript — risks"),
    ...rowsFromDescriptions("Assumption", lists.assumptions),
    ...rowsFromDescriptions("Issue", lists.issues),
    ...rowsFromDescriptions("Dependency", lists.dependencies),
    ...rowsFromDescriptions(
      "Assumption",
      lists.openQuestions,
      "Open question"
    ),
  ];

  const fromInline = [
    ...extractInlineLabelLines(
      text,
      /^risks?(?:\s*\/\s*blockers?)?\s*:\s*(.+)$/i,
      "Risk",
      "Transcript — risks"
    ),
    ...extractInlineLabelLines(
      text,
      /^open questions?\s*:\s*(.+)$/i,
      "Assumption",
      "Open question"
    ),
    ...extractInlineLabelLines(
      text,
      /^assumptions?\s*:\s*(.+)$/i,
      "Assumption",
      "Transcript — assumptions"
    ),
    ...extractInlineLabelLines(
      text,
      /^dependencies?\s*:\s*(.+)$/i,
      "Dependency",
      "Transcript — dependencies"
    ),
    ...extractInlineLabelLines(
      text,
      /^decisions?\s*:\s*(.+)$/i,
      "Assumption",
      "Meeting decision"
    ),
  ];

  const fromBugLines: RaidLogRow[] = [];
  const BUG_LINE =
    /Bug\s+([A-Z][A-Z0-9]+-\d+)\s+"([^"]+)"(?:\s*\.?)\s*(.*)$/i;
  for (const rawLine of text.split("\n")) {
    const line = stripTranscriptLinePrefix(rawLine);
    const m = line.match(BUG_LINE);
    if (!m) continue;
    const tail = m[3] ?? "";
    const priority = tail.match(/\bPriority\s+(\w+)/i)?.[1]?.trim() ?? "";
    const assignee =
      tail.match(/\bAssignee\s+([^.,]+?)(?:\s*\.|,|\s+Due\b)/i)?.[1]?.trim() ??
      "";
    const dueDate = tail.match(/\bDue\s+(.+?)(?:\.|$)/i)?.[1]?.trim() ?? "";
    const status = tail.match(/\bStatus\s+([^.,]+)/i)?.[1]?.trim() ?? "Open";
    const description = `${m[1]}: ${m[2].trim()}`;
    const base = {
      description,
      owner: assignee === "unassigned" ? "" : assignee,
      impact: priority,
      probability: "",
      status: mapJiraStatusToRaid(status),
      mitigation: "",
      targetDate: dueDate,
    };
    const severe =
      /critical|high/i.test(priority) ||
      /production|security|regression|escalat/i.test(line);
    if (severe) {
      fromBugLines.push(
        normalizeRaidRow({
          ...base,
          category: "Risk",
          notes: "Defect — elevated to risk",
        })
      );
    }
    fromBugLines.push(
      normalizeRaidRow({
        ...base,
        category: "Issue",
        notes: "Defect from transcript",
      })
    );
  }

  const fromEscalations: RaidLogRow[] = [];
  for (const rawLine of text.split("\n")) {
    const line = stripTranscriptLinePrefix(rawLine);
    const m = line.match(
      /escalation\s+(?:one|two|three|four|\d+)[—\-:]\s*(.+)$/i
    );
    if (m?.[1]) {
      fromEscalations.push(
        normalizeRaidRow({
          category: "Issue",
          description: m[1].trim(),
          status: "Open",
          notes: "Escalation",
        })
      );
    }
  }

  const fromDependencies: RaidLogRow[] = [];
  for (const rawLine of text.split("\n")) {
    const line = stripTranscriptLinePrefix(rawLine);
    const depWas = line.match(
      /\bdependency\s+was\s+(.+?)(?:\.|;|$)/i
    );
    if (depWas?.[1]) {
      fromDependencies.push(
        normalizeRaidRow({
          category: "Dependency",
          description: depWas[1].trim(),
          status: "Open",
          notes: "Transcript",
        })
      );
    }
    const dependsOn = line.match(/\bdepends on\s+(.+?)(?:\.|,|;|$)/i);
    if (dependsOn?.[1] && dependsOn[1].length > 12) {
      fromDependencies.push(
        normalizeRaidRow({
          category: "Dependency",
          description: dependsOn[1].trim(),
          status: "Open",
          notes: "Transcript",
        })
      );
    }
    if (/\bstatus is blocked\b/i.test(line)) {
      const summary = line.length > 200 ? line.slice(0, 200) + "…" : line;
      fromDependencies.push(
        normalizeRaidRow({
          category: "Issue",
          description: summary,
          status: "Open",
          notes: "Blocked item",
        })
      );
    }
  }

  const fromNarrative = extractRaidFromNarrative(text);

  return dedupeRaidRows([
    ...fromLists,
    ...fromInline,
    ...fromBugLines,
    ...fromEscalations,
    ...fromDependencies,
    ...fromNarrative,
  ]);
}

/** Merge transcript-derived RAID rows into parsed agent output. */
export function enrichParsedRaid(
  parsed: ParsedAgentResponse,
  transcript?: string
): ParsedAgentResponse {
  const extra: RaidLogRow[] = [];
  if (transcript?.trim()) {
    extra.push(...extractRaidFromTranscript(transcript));
  }
  if (parsed.sections.confluence.trim()) {
    extra.push(...extractRaidFromTranscript(parsed.sections.confluence));
  }
  if (parsed.issues.length > 0) {
    extra.push(...raidRowsFromJiraBugs(parsed.issues));
  }

  const merged = dedupeRaidRows([...parsed.raidLog, ...extra]);
  if (merged.length === parsed.raidLog.length) return parsed;

  const raidSection =
    parsed.sections.raid.trim() || formatRaidLogMarkdown(merged);

  return {
    ...parsed,
    raidLog: ensureRaidLogIds(merged),
    sections: { ...parsed.sections, raid: raidSection },
    rawSections: { ...parsed.rawSections, raid: raidSection },
  };
}

/** Build RAID log from agent RAID section + MoM lists (not project plan / Jira). */
export function buildRaidLog(
  raidSectionMarkdown: string,
  confluenceMarkdown: string,
  minutes: MeetingMinutes,
  transcript?: string,
  issues: JiraIssueRow[] = []
): RaidLogRow[] {
  const lists = parseConfluenceRaidLists(confluenceMarkdown);

  const fromTable = parseRaidTable(raidSectionMarkdown);
  const fromRaidSectionNarrative = extractRaidFromNarrative(raidSectionMarkdown);
  const fromConfluenceNarrative = extractRaidFromNarrative(confluenceMarkdown);
  const fromMom = raidRowsFromMomLists(minutes);
  const fromLists = [
    ...rowsFromDescriptions("Risk", lists.risks),
    ...rowsFromDescriptions("Assumption", lists.assumptions),
    ...rowsFromDescriptions("Issue", lists.issues),
    ...rowsFromDescriptions("Dependency", lists.dependencies),
    ...rowsFromDescriptions(
      "Assumption",
      lists.openQuestions,
      "Open question"
    ),
  ];

  const fromConfluenceInline = extractRaidFromTranscript(confluenceMarkdown);
  const fromTranscript = transcript?.trim()
    ? extractRaidFromTranscript(transcript)
    : [];
  const fromJiraBugs = raidRowsFromJiraBugs(issues);

  return dedupeRaidRows([
    ...fromTable,
    ...fromRaidSectionNarrative,
    ...fromConfluenceNarrative,
    ...fromMom,
    ...fromLists,
    ...fromConfluenceInline,
    ...fromTranscript,
    ...fromJiraBugs,
  ]);
}

export function ensureRaidLogIds(rows: RaidLogRow[]): RaidLogRow[] {
  return rows.map((r) => (r.id ? r : { ...r, id: newRaidId() }));
}
