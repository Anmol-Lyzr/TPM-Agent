import {
  extractJiraIssuesFromTranscript,
  mergeJiraIssues,
} from "@/lib/jiraFromTranscript";
import {
  enrichProjectPlan,
  enrichProjectPlanRow,
  filterBugsFromProjectPlan,
} from "@/lib/projectPlan";
import {
  buildRaidLog,
  extractBulletsUnderHeader,
  formatRaidLogMarkdown,
  parseConfluenceRaidLists,
} from "@/lib/raidLog";
import type {
  JiraAction,
  JiraIssueRow,
  MeetingMinutes,
  ParsedAgentResponse,
  ProjectPlanRow,
} from "@/types/tpm";

import type { AgentMainSections } from "@/types/tpm";

type SectionKey = keyof AgentMainSections;

/** Map agent section titles to canonical buckets (matches TPM agent output). */
function sectionKeyFromHeading(title: string): SectionKey | null {
  const t = title
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/, "")
    .replace(/^\d+\.\s*/, "")
    .trim()
    .toLowerCase();

  if (
    t.includes("confluence") ||
    t.includes("meeting summary") ||
    t.includes("minutes of meeting") ||
    t === "mom" ||
    (t.includes("meeting") &&
      (t.includes("summary") || t.includes("minutes") || t.includes("notes")))
  ) {
    return "confluence";
  }
  if (
    t.includes("jira") ||
    t.includes("issue tracker") ||
    t.includes("task list") ||
    t.includes("excel import")
  ) {
    return "jira";
  }
  if (t.includes("smartsheet") || t.includes("project plan")) {
    return "smartsheet";
  }
  if (t.includes("raid")) {
    return "raid";
  }
  return null;
}

/** Detect numbered / markdown section headers from agent output. */
function parseSectionHeader(line: string): SectionKey | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const h = trimmed.match(/^#{1,4}\s+(.+)$/);
  if (h) return sectionKeyFromHeading(h[1]);

  const numbered = trimmed.match(
    /^(?:\*\*)?\d+\.\s*(.+?)(?:\*\*)?(?:\s*[—\-:|]\s*(.*))?$/i
  );
  if (numbered) {
    const combined = [numbered[1], numbered[2]].filter(Boolean).join(" — ");
    return sectionKeyFromHeading(combined);
  }

  const boldOnly = trimmed.match(/^\*\*(.+?)\*\*\s*$/);
  if (boldOnly) return sectionKeyFromHeading(boldOnly[1]);

  if (
    /^(confluence|jira|smartsheet|raid)\b/i.test(trimmed) &&
    /[—\-:|]/.test(trimmed)
  ) {
    return sectionKeyFromHeading(trimmed);
  }

  return null;
}

export interface SectionExtractResult {
  sections: AgentMainSections;
  extensions: Record<string, string>;
  sectionKeysFound: string[];
  extensionKeysFound: string[];
}

function slugifyExtensionKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

function parseUnknownSectionHeader(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // MoM numbered action items — not top-level agent sections
  if (/^\d+\.\s+[a-z]/.test(trimmed)) return null;
  if (/owner:|due:|priority:|assignee:/i.test(trimmed)) return null;

  const h = trimmed.match(/^#{1,4}\s+(.+)$/);
  if (h && !sectionKeyFromHeading(h[1])) return h[1].trim();

  const numbered = trimmed.match(
    /^(?:\*\*)?\d+\.\s*(.+?)(?:\*\*)?(?:\s*[—\-:|]\s*(.*))?$/i
  );
  if (numbered) {
    const combined = [numbered[1], numbered[2]].filter(Boolean).join(" — ");
    const title = combined.trim();
    if (!sectionKeyFromHeading(title) && /^[A-Z]/.test(title)) {
      return title;
    }
  }

  const boldOnly = trimmed.match(/^\*\*(.+?)\*\*\s*$/);
  if (boldOnly && !sectionKeyFromHeading(boldOnly[1])) return boldOnly[1].trim();

  return null;
}

/**
 * Extract agent output blocks (Confluence, JIRA, Smartsheet, RAID) plus extension sections.
 */
export function extractMainSections(markdown: string): SectionExtractResult {
  const buffers: Record<SectionKey, string[]> = {
    confluence: [],
    jira: [],
    smartsheet: [],
    raid: [],
  };
  const extensionBuffers: Record<string, string[]> = {};
  const sectionKeysFound: string[] = [];
  const extensionKeysFound: string[] = [];

  let current: SectionKey | null = null;
  let currentExtension: string | null = null;

  for (const line of markdown.split("\n")) {
    const section = parseSectionHeader(line);
    if (section) {
      current = section;
      currentExtension = null;
      if (!sectionKeysFound.includes(section)) sectionKeysFound.push(section);
      continue;
    }

    const unknownTitle =
      current === null && !currentExtension
        ? parseUnknownSectionHeader(line)
        : null;
    if (unknownTitle) {
      current = null;
      currentExtension = slugifyExtensionKey(unknownTitle);
      if (!extensionKeysFound.includes(currentExtension)) {
        extensionKeysFound.push(currentExtension);
      }
      extensionBuffers[currentExtension] =
        extensionBuffers[currentExtension] ?? [];
      continue;
    }

    if (currentExtension && extensionBuffers[currentExtension]) {
      extensionBuffers[currentExtension].push(line);
    } else if (current === "confluence") buffers.confluence.push(line);
    else if (current === "jira") buffers.jira.push(line);
    else if (current === "smartsheet") buffers.smartsheet.push(line);
    else if (current === "raid") buffers.raid.push(line);
  }

  const extensions = Object.fromEntries(
    Object.entries(extensionBuffers).map(([k, lines]) => [
      k,
      lines.join("\n").trim(),
    ])
  );

  return {
    sections: {
      confluence: buffers.confluence.join("\n").trim(),
      jira: buffers.jira.join("\n").trim(),
      smartsheet: buffers.smartsheet.join("\n").trim(),
      raid: buffers.raid.join("\n").trim(),
    },
    extensions,
    sectionKeysFound,
    extensionKeysFound,
  };
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

const JIRA_KEY_REGEX = /\b([A-Z][A-Z0-9]+-\d+)\b/;
const ACTION_REGEX = /\b(created|updated|commented)\b/i;

function parseAction(text: string): JiraAction {
  const lower = text.toLowerCase();
  if (lower.includes("created")) return "created";
  if (lower.includes("updated")) return "updated";
  if (lower.includes("commented")) return "commented";
  return "unknown";
}

function parseJiraTable(jiraText: string): JiraIssueRow[] {
  if (!jiraText.trim()) return [];

  const issues: JiraIssueRow[] = [];
  const tableRows = parseMarkdownTable(jiraText);

  if (tableRows.length > 1) {
    const headers = tableRows[0].map((h) => h.toLowerCase());
    const typeIdx = headers.findIndex(
      (h) => h.includes("issue type") || h === "type"
    );
    const keyIdx = headers.findIndex((h) => h === "key" || h.includes("key"));
    const summaryIdx = headers.findIndex(
      (h) => h.includes("summary") || h.includes("title")
    );
    const statusIdx = headers.findIndex((h) => h.includes("status"));
    const assigneeIdx = headers.findIndex(
      (h) => h.includes("assign") || h.includes("assigned")
    );
    const dueIdx = headers.findIndex((h) => h.includes("due"));
    const priorityIdx = headers.findIndex((h) => h.includes("priority"));

    for (let i = 1; i < tableRows.length; i++) {
      const row = tableRows[i];
      const rawKey = keyIdx >= 0 ? row[keyIdx] : "";
      const keyMatch = rawKey.match(JIRA_KEY_REGEX);
      const key = keyMatch?.[0] ?? (rawKey.trim() || `NEW-${i}`);
      const summary = summaryIdx >= 0 ? row[summaryIdx] : row[2] ?? "";

      issues.push({
        key,
        summary: summary || key,
        action: "unknown",
        status: statusIdx >= 0 ? row[statusIdx] : undefined,
        assignee: assigneeIdx >= 0 ? row[assigneeIdx] : undefined,
        dueDate: dueIdx >= 0 ? row[dueIdx] : undefined,
        priority: priorityIdx >= 0 ? row[priorityIdx] : undefined,
        issueType: typeIdx >= 0 ? row[typeIdx] : undefined,
      });
    }
    if (issues.length > 0) return issues;
  }

  const seen = new Set<string>();
  for (const line of jiraText.split("\n")) {
    const keyMatch = line.match(JIRA_KEY_REGEX);
    if (!keyMatch || seen.has(keyMatch[0])) continue;
    seen.add(keyMatch[0]);
    issues.push({
      key: keyMatch[0],
      summary: line.replace(keyMatch[0], "").replace(/^[-*•]\s*/, "").trim() || keyMatch[0],
      action: parseAction(line.match(ACTION_REGEX)?.[0] ?? ""),
    });
  }

  return issues;
}

function extractTaskNumber(taskDesc: string): number | undefined {
  const match = taskDesc.match(/^(\d+)\s/);
  return match ? parseInt(match[1], 10) : undefined;
}

function parseSmartsheetTable(smartsheetText: string): ProjectPlanRow[] {
  if (!smartsheetText.trim()) return [];

  const rows = parseMarkdownTable(smartsheetText);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.toLowerCase());
  const wbsIdx = headers.findIndex((h) => h.includes("wbs"));
  const nameIdx = headers.findIndex(
    (h) => h.includes("task name") || (h === "task" && !h.includes("desc"))
  );
  const descIdx = headers.findIndex(
    (h) =>
      h.includes("task description") ||
      h.includes("task desc") ||
      (h.includes("desc") && !h.includes("dependency")) ||
      h.includes("activity")
  );
  const legacyDescIdx =
    descIdx < 0
      ? headers.findIndex(
          (h) =>
            (h.includes("task") || h.includes("name")) &&
            !h.includes("wbs") &&
            nameIdx < 0
        )
      : -1;
  const taskDescIdx = descIdx >= 0 ? descIdx : legacyDescIdx;
  const startIdx = headers.findIndex((h) => h.includes("start"));
  const endIdx = headers.findIndex(
    (h) => h.includes("end") && !h.includes("dependency")
  );
  const durationIdx = headers.findIndex((h) => h.includes("duration"));
  const ownerIdx = headers.findIndex(
    (h) => h.includes("owner") || h.includes("resource")
  );
  const depIdx = headers.findIndex(
    (h) => h.includes("dependency") || h.includes("predecessor")
  );
  const statusIdx = headers.findIndex((h) => h.includes("status"));
  const priorityIdx = headers.findIndex((h) => h.includes("priority"));
  const commentsIdx = headers.findIndex(
    (h) => h.includes("comment") || h.includes("notes")
  );
  const typeIdx = headers.findIndex(
    (h) => h === "type" || h.includes("row type") || h.includes("task type")
  );

  const plan: ProjectPlanRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const taskName = nameIdx >= 0 ? row[nameIdx] : "";
    const taskDesc =
      (taskDescIdx >= 0 ? row[taskDescIdx] : taskName || row[0]) ?? "";
    if (!taskDesc && !taskName) continue;

    const base: ProjectPlanRow = {
      wbsId: wbsIdx >= 0 ? row[wbsIdx] : "",
      taskName: taskName || undefined,
      taskDesc: taskDesc || taskName,
      start: startIdx >= 0 ? row[startIdx] : "",
      end: endIdx >= 0 ? row[endIdx] : "",
      duration: durationIdx >= 0 ? row[durationIdx] : "",
      owner: ownerIdx >= 0 ? row[ownerIdx] : "",
      dependency: depIdx >= 0 ? row[depIdx] : "",
      status: statusIdx >= 0 ? row[statusIdx] : "",
      priority: priorityIdx >= 0 ? row[priorityIdx] : "",
      comments: commentsIdx >= 0 ? row[commentsIdx] : "",
      taskNumber: extractTaskNumber(taskDesc || taskName),
    };
    const rowType = typeIdx >= 0 ? row[typeIdx] : undefined;
    plan.push(enrichProjectPlanRow(base, rowType));
  }
  return plan;
}

function extractConfluenceLink(text: string): {
  url: string | null;
  title: string | null;
} {
  const mdLink = text.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/i);
  if (mdLink) {
    const url = mdLink[2];
    if (/confluence|atlassian\.net\/wiki/i.test(url)) {
      return { title: mdLink[1], url };
    }
  }
  const plainUrl = text.match(
    /(https?:\/\/[^\s)]*(?:confluence|atlassian\.net\/wiki)[^\s)]*)/i
  );
  return plainUrl ? { title: null, url: plainUrl[1] } : { url: null, title: null };
}

function extractMeetingTitle(confluenceText: string): string | undefined {
  for (const line of confluenceText.split("\n")) {
    const l = line.trim();
    if (!l) continue;
    if (/^#+\s*Meeting notes/i.test(l)) continue;
    if (/^#+\s/.test(l)) continue;
    if (/^(date|summary|decisions|action|risk|open)\b/i.test(l)) continue;
    if (/^[-*•]/.test(l)) continue;
    if (/^\d+\.\s/.test(l) && !parseSectionHeader(l)) continue;
    return l.replace(/^#+\s*/, "").replace(/^\*\*|\*\*$/g, "").trim();
  }
  return undefined;
}

function extractMomDate(text: string): string | undefined {
  for (const line of text.split("\n")) {
    const m = line.match(
      /^(?:[-*•]\s*)?(?:\*\*)?Date(?:\s*\/\s*attendees?)?(?:\*\*)?\s*:?\s*(.+)$/i
    );
    if (m?.[1] && !/^attendees?\b/i.test(m[1].trim())) {
      return m[1].trim();
    }
  }
  return undefined;
}

function extractMomSummary(text: string): string | undefined {
  const lines = text.split("\n");
  let inSummary = false;
  const parts: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^summary\b/i.test(trimmed)) {
      inSummary = true;
      const inline = trimmed.replace(/^summary\s*:?\s*/i, "").trim();
      if (inline) parts.push(inline);
      continue;
    }
    if (inSummary) {
      if (
        /^(decisions?|action\s*items?|risks?|open questions?|attendees?|date\b)/i.test(
          trimmed
        )
      ) {
        break;
      }
      if (trimmed) parts.push(trimmed.replace(/^[-*•]\s+/, ""));
    }
  }

  const joined = parts.join(" ").trim();
  return joined || undefined;
}

function parseMeetingMinutes(
  confluenceText: string,
  fullMarkdown: string
): MeetingMinutes {
  const { url, title } = extractConfluenceLink(fullMarkdown);
  const raidLists = parseConfluenceRaidLists(confluenceText);

  const attendees = extractBulletsUnderHeader(
    confluenceText,
    /^attendees?\b/i
  );
  const decisions = extractBulletsUnderHeader(
    confluenceText,
    /^decisions?\b/i
  );
  const actionItems = extractBulletsUnderHeader(
    confluenceText,
    /^action\s*items?(?:\s*&\s*next\s*steps?)?\b/i
  );

  return {
    title: extractMeetingTitle(confluenceText),
    date: extractMomDate(confluenceText),
    summary: extractMomSummary(confluenceText),
    attendees,
    decisions,
    actionItems,
    risks: raidLists.risks,
    openQuestions: raidLists.openQuestions,
    confluenceLink: url ?? undefined,
    confluenceTitle: title ?? undefined,
    rawBody: confluenceText.trim(),
  };
}

/** Markdown-only parse (used by pipeline and tests). */
export function parseAgentMarkdown(
  markdown: string,
  options?: { transcript?: string }
): Omit<
  ParsedAgentResponse,
  "sourceMarkdown" | "extensions" | "extra" | "parseMeta"
> & {
  extensions: Record<string, string>;
  sectionKeysFound: string[];
  extensionKeysFound: string[];
} {
  const extracted = extractMainSections(markdown);
  const sections = extracted.sections;
  const { url: confluenceLink, title: confluenceTitle } =
    extractConfluenceLink(markdown);

  const fromAgent = parseJiraTable(sections.jira);
  const fromTranscriptIssues = options?.transcript?.trim()
    ? extractJiraIssuesFromTranscript(options.transcript)
    : [];
  const issues = mergeJiraIssues(fromAgent, fromTranscriptIssues);
  const projectPlan = filterBugsFromProjectPlan(
    enrichProjectPlan(parseSmartsheetTable(sections.smartsheet)),
    issues
  );
  const meetingMinutes = parseMeetingMinutes(sections.confluence, markdown);

  if (!meetingMinutes.title && confluenceTitle) {
    meetingMinutes.title = confluenceTitle;
  }

  const raidLog = buildRaidLog(
    sections.raid,
    sections.confluence,
    meetingMinutes,
    options?.transcript,
    issues
  );

  const raidSection =
    sections.raid.trim() || formatRaidLogMarkdown(raidLog);

  return {
    issues,
    projectPlan,
    raidLog,
    meetingMinutes,
    confluenceLink,
    rawSections: {
      confluence: sections.confluence,
      jira: sections.jira,
      smartsheet: sections.smartsheet,
      raid: raidSection,
    },
    sections: {
      ...sections,
      raid: raidSection,
    },
    extensions: extracted.extensions,
    sectionKeysFound: extracted.sectionKeysFound,
    extensionKeysFound: extracted.extensionKeysFound,
  };
}

