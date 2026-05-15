import type {
  JiraAction,
  JiraIssueRow,
  MeetingMinutes,
  ParsedAgentResponse,
  ProjectPlanRow,
  TaskRow,
} from "@/types/tpm";

import type { AgentMainSections } from "@/types/tpm";

/** Major outputs only — do NOT split on "1. Add comment…" inside MoM */
const MAJOR_SECTION_LINE =
  /^\d+\.\s*(Confluence|JIRA|Jira|Smartsheet)\b/i;

const H3_SECTION_LINE = /^###\s+(.+)$/;

/**
 * Extract the three agent output blocks (Confluence, JIRA, Smartsheet).
 * Matches Lyzr Studio format: "1. Confluence — …", "2. JIRA — …", "3. Smartsheet — …"
 */
function extractMainSections(markdown: string): AgentMainSections {
  const result: AgentMainSections = {
    confluence: "",
    jira: "",
    smartsheet: "",
  };

  const lines = markdown.split("\n");
  type SectionKey = keyof AgentMainSections;
  let current: SectionKey | null = null;
  const buffers: Record<SectionKey, string[]> = {
    confluence: [],
    jira: [],
    smartsheet: [],
  };

  const assignBuffer = (key: SectionKey) => {
    current = key;
  };

  for (const line of lines) {
    const h3 = line.match(H3_SECTION_LINE);
    if (h3) {
      const title = h3[1].toLowerCase();
      if (title.includes("confluence") || title.includes("meeting")) {
        assignBuffer("confluence");
      } else if (title.includes("jira") || title.includes("results")) {
        assignBuffer("jira");
      } else if (title.includes("smartsheet") || title.includes("project plan")) {
        assignBuffer("smartsheet");
      }
      continue;
    }

    if (MAJOR_SECTION_LINE.test(line)) {
      const lower = line.toLowerCase();
      if (lower.includes("confluence")) assignBuffer("confluence");
      else if (lower.includes("jira")) assignBuffer("jira");
      else if (lower.includes("smartsheet")) assignBuffer("smartsheet");
      continue;
    }

    if (current === "confluence") buffers.confluence.push(line);
    else if (current === "jira") buffers.jira.push(line);
    else if (current === "smartsheet") buffers.smartsheet.push(line);
  }

  result.confluence = buffers.confluence.join("\n").trim();
  result.jira = buffers.jira.join("\n").trim();
  result.smartsheet = buffers.smartsheet.join("\n").trim();

  return result;
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
  const descIdx = headers.findIndex(
    (h) => h.includes("task") || h.includes("desc")
  );
  const startIdx = headers.findIndex((h) => h.includes("start"));
  const endIdx = headers.findIndex(
    (h) => h.includes("end") && !h.includes("dependency")
  );
  const durationIdx = headers.findIndex((h) => h.includes("duration"));
  const ownerIdx = headers.findIndex((h) => h.includes("owner"));
  const depIdx = headers.findIndex(
    (h) => h.includes("dependency") || h.includes("predecessor")
  );
  const commentsIdx = headers.findIndex((h) => h.includes("comment"));

  const plan: ProjectPlanRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const taskDesc = descIdx >= 0 ? row[descIdx] : row[0] ?? "";
    if (!taskDesc) continue;

    plan.push({
      taskDesc,
      start: startIdx >= 0 ? row[startIdx] : "",
      end: endIdx >= 0 ? row[endIdx] : "",
      duration: durationIdx >= 0 ? row[durationIdx] : "",
      owner: ownerIdx >= 0 ? row[ownerIdx] : "",
      dependency: depIdx >= 0 ? row[depIdx] : "",
      comments: commentsIdx >= 0 ? row[commentsIdx] : "",
      taskNumber: extractTaskNumber(taskDesc),
    });
  }
  return plan;
}

export function projectPlanToTasks(plan: ProjectPlanRow[]): TaskRow[] {
  return plan.map((row) => ({
    taskNumber: row.taskNumber ?? 0,
    description: row.taskDesc.replace(/^\d+\s+/, ""),
    owner: row.owner,
    start: row.start,
    end: row.end,
    dependency: row.dependency,
    status: row.start || row.end ? "Scheduled" : "Unscheduled",
  }));
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
    if (/^\d+\.\s/.test(l) && !MAJOR_SECTION_LINE.test(l)) continue;
    return l.replace(/^#+\s*/, "").replace(/^\*\*|\*\*$/g, "").trim();
  }
  return undefined;
}

function parseMeetingMinutes(
  confluenceText: string,
  fullMarkdown: string
): MeetingMinutes {
  const { url, title } = extractConfluenceLink(fullMarkdown);

  const minutes: MeetingMinutes = {
    attendees: [],
    decisions: [],
    actionItems: [],
    risks: [],
    openQuestions: [],
    confluenceLink: url ?? undefined,
    confluenceTitle: title ?? undefined,
    rawBody: confluenceText.trim(),
    title: extractMeetingTitle(confluenceText),
  };

  return minutes;
}

export function parseAgentResponse(markdown: string): ParsedAgentResponse {
  const sections = extractMainSections(markdown);
  const { url: confluenceLink, title: confluenceTitle } =
    extractConfluenceLink(markdown);

  const issues = parseJiraTable(sections.jira);
  const projectPlan = parseSmartsheetTable(sections.smartsheet);
  const tasks = projectPlanToTasks(projectPlan);
  const meetingMinutes = parseMeetingMinutes(sections.confluence, markdown);

  if (!meetingMinutes.title && confluenceTitle) {
    meetingMinutes.title = confluenceTitle;
  }

  return {
    issues,
    projectPlan,
    tasks,
    meetingMinutes,
    confluenceLink,
    rawSections: {
      confluence: sections.confluence,
      jira: sections.jira,
      smartsheet: sections.smartsheet,
    },
    sections,
  };
}
