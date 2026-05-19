import type { JiraIssueRow, ProjectPlanRow } from "@/types/tpm";
import { isBugIssue } from "@/lib/analytics";

/** Smartsheet WBS column headers (CCB onboarding template). */
export const PROJECT_PLAN_COLUMNS = [
  "WBS ID",
  "Task Name",
  "Task Description",
  "Owner / Resource",
  "Start Date",
  "End Date",
  "Duration (Days)",
  "Dependency (WBS ID)",
  "Status",
  "Priority",
  "Comments / Notes",
] as const;

/** Remove markdown bold markers from agent/Smartsheet cells. */
export function stripPlanMarkdown(value: string): string {
  return value.replace(/\*\*/g, "").trim();
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function parsePlanDate(value: string): Date | null {
  const text = stripPlanMarkdown(value);
  if (!text) return null;

  const dmy = text.match(/^(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?$/);
  if (dmy) {
    const month = MONTH_INDEX[dmy[2].slice(0, 3).toLowerCase()];
    if (month === undefined) return null;
    const year = dmy[3] ? parseInt(dmy[3], 10) : new Date().getFullYear();
    return new Date(year, month, parseInt(dmy[1], 10));
  }

  const mdy = text.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (mdy) {
    const month = MONTH_INDEX[mdy[1].slice(0, 3).toLowerCase()];
    if (month === undefined) return null;
    return new Date(parseInt(mdy[3], 10), month, parseInt(mdy[2], 10));
  }

  return null;
}

function computeDurationDays(start: string, end: string): number | null {
  const startDate = parsePlanDate(start);
  const endDate = parsePlanDate(end);
  if (!startDate || !endDate) return null;
  const diff = Math.round(
    (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (diff < 0) return null;
  return diff === 0 ? 1 : diff;
}

/** Normalize agent duration cells ("3 days", auto-calc from dates). */
export function normalizePlanDuration(
  raw: string,
  start = "",
  end = ""
): string {
  const text = stripPlanMarkdown(raw);
  const fromText = text.match(/^(\d+(?:\.\d+)?)\s*(?:business\s+)?days?\b/i);
  if (fromText) return fromText[1];
  if (/^\d+(?:\.\d+)?$/.test(text)) return text;

  const computed = computeDurationDays(start, end);
  if (computed != null) return String(computed);
  return text;
}

const WBS_PREFIX_RE = /^((?:\d+(?:\.\d+)*|M\d+|0))\s+(.+)$/i;
const NUMERIC_WBS_RE = /^\d+(?:\.\d+)*$/;
const MILESTONE_WBS_RE = /^M\d+$/i;

/** Work-item WBS ids (1.1, 2.0) — not Smartsheet milestone ids (M1, M2). */
export function isNumericPlanWbsId(wbsId: string): boolean {
  return NUMERIC_WBS_RE.test(wbsId.trim());
}

export function isMilestonePlanWbsId(wbsId: string): boolean {
  return MILESTONE_WBS_RE.test(wbsId.trim());
}

export function stripMilestonePrefix(text: string): string {
  return stripPlanMarkdown(text)
    .replace(/^MILESTONE:\s*/i, "")
    .replace(/^milestone:\s*/i, "")
    .trim();
}

/** Split a combined "1.1.1 Task name" cell into WBS id and label. */
export function parseWbsTaskLine(text: string): { wbsId: string; label: string } | null {
  const trimmed = stripPlanMarkdown(text);
  const match = trimmed.match(WBS_PREFIX_RE);
  if (!match) return null;
  return { wbsId: match[1], label: match[2].trim() };
}

export function formatMilestoneTaskName(title: string): string {
  const clean = stripPlanMarkdown(title).replace(/^milestone\s*:\s*/i, "").trim();
  if (!clean) return "MILESTONE";
  if (/^milestone\s*:/i.test(clean)) return clean.replace(/^milestone\s*:/i, "MILESTONE:").trim();
  return `MILESTONE: ${clean}`;
}

/** Action-verb task names (work items), not phase/milestone headers. */
const WORK_ITEM_START =
  /^(finalize|define|build|complete|publish|create|draft|set up|integrate|add|fix|implement|review|schedule|update|develop|test|deploy|identify|conduct|prepare|document|configure|migrate|refactor|pilot training|train|deliver|execute|run|perform|analyze|assess|validate|verify|write|design|gather|prototype)\b/i;

/** Detect milestone rows from task description text. */
export function parseMilestoneDescriptor(taskDesc: string): {
  isMilestone: boolean;
  title: string;
} {
  const raw = taskDesc.trim();
  const boldWrap = raw.match(/^\*\*(.+)\*\*$/);
  if (boldWrap) {
    const inner = boldWrap[1].trim();
    const labeled = inner.match(/^milestone\s*:\s*(.+)$/i);
    if (labeled) {
      return { isMilestone: true, title: labeled[1].trim() };
    }
    return { isMilestone: false, title: inner };
  }

  const text = stripPlanMarkdown(taskDesc);
  const explicit = text.match(/^milestone\s*:\s*(.+)$/i);
  if (explicit) {
    return { isMilestone: true, title: explicit[1].trim() };
  }
  if (/^milestone\b/i.test(text)) {
    const title = text.replace(/^milestone\s*:?\s*/i, "").trim();
    return { isMilestone: true, title: title || text };
  }
  return { isMilestone: false, title: text };
}

export function looksLikeWorkItem(taskDesc: string): boolean {
  const text = stripPlanMarkdown(taskDesc);
  if (/^\d+(\.\d+)+\s/.test(text)) return true;
  if (/^\d+\s+\S/.test(text)) return true;
  if (/\bspike\b/i.test(text)) return true;
  return WORK_ITEM_START.test(text);
}

function rowLabel(row: ProjectPlanRow): string {
  return row.taskName?.trim() || row.taskDesc?.trim() || "";
}

/** Hard rules: numeric WBS and delivery tasks are never milestones. */
export function isProjectPlanMilestone(row: ProjectPlanRow): boolean {
  const wbsId = getPlanWbsId(row);
  if (wbsId && isNumericPlanWbsId(wbsId)) return false;

  const label = rowLabel(row);
  if (label && looksLikeWorkItem(label)) return false;

  if (wbsId && isMilestonePlanWbsId(wbsId)) return true;
  if (row.isMilestone) return true;

  const fromName = parseMilestoneDescriptor(row.taskName ?? "");
  const fromDesc = parseMilestoneDescriptor(row.taskDesc);
  return fromName.isMilestone || fromDesc.isMilestone;
}

export function getMilestoneTitle(row: ProjectPlanRow): string {
  if (row.milestoneTitle?.trim()) return row.milestoneTitle.trim();
  const fromName = parseMilestoneDescriptor(row.taskName ?? "");
  if (fromName.isMilestone) return fromName.title;
  return parseMilestoneDescriptor(row.taskDesc).title;
}

export function getPlanWbsId(row: ProjectPlanRow): string {
  if (row.wbsId?.trim()) return row.wbsId.trim();
  const fromName = parseWbsTaskLine(row.taskName ?? "");
  if (fromName) return fromName.wbsId;
  const fromDesc = parseWbsTaskLine(row.taskDesc);
  if (fromDesc) return fromDesc.wbsId;
  return "";
}

export function getPlanTaskName(row: ProjectPlanRow): string {
  if (row.taskName?.trim()) {
    return isProjectPlanMilestone(row)
      ? formatMilestoneTaskName(row.taskName)
      : row.taskName.trim();
  }
  if (isProjectPlanMilestone(row)) {
    return formatMilestoneTaskName(getMilestoneTitle(row));
  }
  const fromDesc = parseWbsTaskLine(row.taskDesc);
  if (fromDesc) return fromDesc.label;
  return stripPlanMarkdown(row.taskDesc);
}

export function getPlanTaskDescription(row: ProjectPlanRow): string {
  if (!row.taskDesc?.trim()) return "";
  const name = getPlanTaskName(row);
  const desc = row.taskDesc.trim();
  const descWbs = parseWbsTaskLine(desc);
  if (descWbs && name && descWbs.label === name) return "";
  if (isProjectPlanMilestone(row)) {
    const title = getMilestoneTitle(row);
    const plain = stripPlanMarkdown(desc);
    if (plain.toLowerCase() === title.toLowerCase()) return "";
    if (/^milestone\s*:/i.test(plain)) return "";
    return desc;
  }
  if (name && stripPlanMarkdown(desc) === stripPlanMarkdown(name)) return "";
  return desc;
}

/** Infer phase/milestone rows when the agent omits the "Milestone:" label. */
export function inferMilestonesFromStructure(
  rows: ProjectPlanRow[]
): ProjectPlanRow[] {
  const result = rows.map((r) => ({ ...r }));

  for (let i = 0; i < result.length; i++) {
    const label = result[i].taskName ?? result[i].taskDesc;
    const wbsId = getPlanWbsId(result[i]);
    if (wbsId && isNumericPlanWbsId(wbsId)) continue;
    if (looksLikeWorkItem(label)) continue;
    if (
      result[i].isMilestone ||
      parseMilestoneDescriptor(label).isMilestone
    ) {
      continue;
    }

    const desc = result[i].taskDesc;
    const next = result[i + 1];
    const prev = result[i - 1];

    let shouldMark = false;

    const topWbs = stripPlanMarkdown(desc).match(/^(\d+)\s+(.+)$/);
    if (topWbs && next) {
      const nextText = stripPlanMarkdown(next.taskDesc);
      const nextWbs = nextText.match(/^(\d+(?:\.\d+)+)\s/);
      const nextDep = next.dependency?.match(/^(\d+(?:\.\d+)+)/);
      if (
        (nextWbs && nextWbs[1].startsWith(`${topWbs[1]}.`)) ||
        (nextDep && nextDep[1].startsWith(`${topWbs[1]}.`))
      ) {
        shouldMark = true;
      }
    }

    if (
      !shouldMark &&
      !looksLikeWorkItem(desc) &&
      next &&
      looksLikeWorkItem(next.taskDesc)
    ) {
      shouldMark = true;
    }

    if (
      !shouldMark &&
      !looksLikeWorkItem(desc) &&
      prev &&
      (prev.isMilestone || looksLikeWorkItem(prev.taskDesc)) &&
      next &&
      looksLikeWorkItem(next.taskDesc)
    ) {
      shouldMark = true;
    }

    if (!shouldMark) continue;

    const title = stripPlanMarkdown(topWbs ? topWbs[2] : desc).replace(
      /^milestone\s*:\s*/i,
      ""
    );

    result[i] = {
      ...result[i],
      isMilestone: true,
      milestoneTitle: title,
      taskName: formatMilestoneTaskName(title),
      taskDesc: result[i].taskDesc,
      taskNumber: undefined,
    };
  }

  return result;
}

/** Assign M1, M2, … to milestone rows missing a WBS id. */
export function assignMilestoneWbsIds(rows: ProjectPlanRow[]): ProjectPlanRow[] {
  let milestoneIndex = 0;
  return rows.map((row) => {
    if (!isProjectPlanMilestone(row)) return row;
    if (getPlanWbsId(row)) return row;
    milestoneIndex += 1;
    return { ...row, wbsId: `M${milestoneIndex}` };
  });
}

function normalizePlanFields(row: ProjectPlanRow): ProjectPlanRow {
  const start = stripPlanMarkdown(row.start);
  const end = stripPlanMarkdown(row.end);
  const duration = normalizePlanDuration(row.duration, row.start, row.end);
  const owner = stripPlanMarkdown(row.owner);
  const dependency = stripPlanMarkdown(row.dependency);
  const comments = stripPlanMarkdown(row.comments);
  const status = stripPlanMarkdown(row.status ?? "");
  const priority = stripPlanMarkdown(row.priority ?? "");

  let wbsId = stripPlanMarkdown(row.wbsId ?? "");
  let taskName = stripPlanMarkdown(row.taskName ?? "");
  let taskDesc = stripPlanMarkdown(row.taskDesc);

  if (!wbsId) {
    const fromName = parseWbsTaskLine(taskName);
    if (fromName) {
      wbsId = fromName.wbsId;
      taskName = fromName.label;
    } else {
      const fromDesc = parseWbsTaskLine(taskDesc);
      if (fromDesc && !taskName) {
        wbsId = fromDesc.wbsId;
        taskName = fromDesc.label;
        taskDesc = "";
      }
    }
  }

  return {
    ...row,
    wbsId: wbsId || undefined,
    taskName: taskName || undefined,
    taskDesc,
    start,
    end,
    duration,
    owner,
    dependency,
    comments,
    status: status || undefined,
    priority: priority || undefined,
  };
}

function asDeliveryTaskRow(normalized: ProjectPlanRow): ProjectPlanRow {
  const fromWbs = parseWbsTaskLine(normalized.taskDesc);
  const rawName =
    normalized.taskName || fromWbs?.label || normalized.taskDesc;
  const taskName = stripMilestonePrefix(rawName);
  const taskDesc = fromWbs
    ? normalized.taskDesc
    : normalized.taskName && normalized.taskDesc !== normalized.taskName
      ? stripMilestonePrefix(normalized.taskDesc)
      : stripMilestonePrefix(normalized.taskDesc || taskName);
  return {
    ...normalized,
    isMilestone: false,
    milestoneTitle: undefined,
    taskName,
    taskDesc,
    wbsId: normalized.wbsId || fromWbs?.wbsId,
  };
}

function asMilestoneRow(
  normalized: ProjectPlanRow,
  title: string
): ProjectPlanRow {
  return {
    ...normalized,
    isMilestone: true,
    milestoneTitle: title,
    taskName: formatMilestoneTaskName(title),
    duration: "",
    taskNumber: undefined,
  };
}

/** Normalize a plan row from agent output (milestones, markdown cleanup). */
export function enrichProjectPlanRow(
  row: ProjectPlanRow,
  rowType?: string
): ProjectPlanRow {
  const normalized = normalizePlanFields(row);
  const wbsId = getPlanWbsId(normalized);

  if (wbsId && isNumericPlanWbsId(wbsId)) {
    return asDeliveryTaskRow(normalized);
  }

  const label = rowLabel(normalized);
  if (label && looksLikeWorkItem(label)) {
    return asDeliveryTaskRow(normalized);
  }

  if (wbsId && isMilestonePlanWbsId(wbsId)) {
    const title =
      normalized.milestoneTitle?.trim() || getMilestoneTitle(normalized);
    return asMilestoneRow(normalized, title);
  }

  if (normalized.isMilestone) {
    const title =
      normalized.milestoneTitle?.trim() || getMilestoneTitle(normalized);
    return asMilestoneRow(normalized, title);
  }

  const typeSaysMilestone = Boolean(
    rowType?.trim() && /milestone/i.test(rowType)
  );
  const fromName = parseMilestoneDescriptor(normalized.taskName ?? "");
  const fromDesc = parseMilestoneDescriptor(normalized.taskDesc);
  const isMilestone =
    typeSaysMilestone || fromName.isMilestone || fromDesc.isMilestone;

  if (!isMilestone) {
    return asDeliveryTaskRow(normalized);
  }

  const title = fromName.isMilestone
    ? fromName.title
    : fromDesc.title;

  return asMilestoneRow(normalized, title);
}

export function enrichProjectPlan(rows: ProjectPlanRow[]): ProjectPlanRow[] {
  const normalized = rows.map((r) => enrichProjectPlanRow(r));
  const withMilestones = inferMilestonesFromStructure(normalized);
  const validated = withMilestones.map((row) =>
    isProjectPlanMilestone(row) ? row : asDeliveryTaskRow(row)
  );
  return assignMilestoneWbsIds(validated);
}

const JIRA_KEY = /\b([A-Z][A-Z0-9]+-\d+)\b/g;
const ISSUE_KEY_RE = /^[A-Z][A-Z0-9]+-\d+$/;
const WBS_ID_RE = /^(?:\d+(?:\.\d+)*|M\d+|0)$/i;

/** True when a WBS id cell holds a Jira key (e.g. HMC-401), not a schedule id (1.1 / M1). */
export function wbsIdLooksLikeIssueKey(wbsId: string): boolean {
  const id = wbsId.trim();
  if (!id || WBS_ID_RE.test(id)) return false;
  return ISSUE_KEY_RE.test(id);
}

function collectJiraKeys(text: string): string[] {
  return [...text.matchAll(JIRA_KEY)].map((m) => m[1]);
}

/**
 * Detect Smartsheet rows that are Jira bugs/defects (belong in Issue Tracker only).
 */
export function isBugProjectPlanRow(
  row: ProjectPlanRow,
  knownBugKeys?: ReadonlySet<string>
): boolean {
  const name = getPlanTaskName(row);
  const desc = getPlanTaskDescription(row);
  const combined = [name, desc, row.taskDesc, row.comments].filter(Boolean).join(" ");

  if (/^bug\s+[A-Z][A-Z0-9]+-\d+/i.test(name)) return true;
  if (/^regression\s+bug\b/i.test(name)) return true;
  if (/\bdefect\s+review\b/i.test(name) && !/\btask\b/i.test(name)) return false;

  const wbsId = getPlanWbsId(row);
  if (wbsId && wbsIdLooksLikeIssueKey(wbsId)) {
    if (knownBugKeys?.has(wbsId)) return true;
    if (/\b(bug|defect|regression)\b/i.test(combined)) return true;
    return true;
  }

  const keys = collectJiraKeys(combined);
  for (const key of keys) {
    if (knownBugKeys?.has(key)) return true;
    if (new RegExp(`\\bBug\\s+${key}\\b`, "i").test(combined)) return true;
    if (
      /\b(bug|defect|regression)\b/i.test(name) &&
      !/\b(complete|outstanding|tracker|excel|burn-down|triage)\b/i.test(name)
    ) {
      return true;
    }
  }

  return false;
}

/** Remove Jira bug/defect rows from the schedule; keep delivery tasks only. */
export function filterBugsFromProjectPlan(
  rows: ProjectPlanRow[],
  issues?: JiraIssueRow[]
): ProjectPlanRow[] {
  const bugKeys = new Set<string>();
  for (const issue of issues ?? []) {
    if (isBugIssue(issue) || /bug|defect/i.test(issue.summary)) {
      bugKeys.add(issue.key);
    }
  }
  return rows.filter((row) => !isBugProjectPlanRow(row, bugKeys));
}
