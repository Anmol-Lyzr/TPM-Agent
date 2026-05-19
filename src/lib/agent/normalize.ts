import type {
  AgentParseMeta,
  JiraAction,
  JiraIssueRow,
  MeetingMinutes,
  ParsedAgentResponse,
  ProjectPlanRow,
  RaidLogRow,
} from "@/types/legacyTpm";
import { enrichProjectPlan, enrichProjectPlanRow } from "@/lib/projectPlan";
import { ensureRaidLogIds, normalizeRaidRow } from "@/lib/raidLog";

import {
  AgentMainSectionsSchema,
  JiraActionSchema,
  JiraIssueRowSchema,
  MeetingMinutesSchema,
  ParsedAgentResponseSchema,
  ProjectPlanRowSchema,
  RaidLogRowSchema,
} from "./schema";

export function asString(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((v) => asString(v)).filter(Boolean).join(", ");
  }
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

export function asStringArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => asString(item).trim())
      .filter((s) => s.length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(/\n|;/)
      .map((s) => s.replace(/^[-*•]\s+/, "").trim())
      .filter(Boolean);
  }
  return [];
}

export function asNullableString(value: unknown): string | null {
  const s = asString(value).trim();
  return s || null;
}

function normalizeJiraAction(value: unknown): JiraAction {
  const parsed = JiraActionSchema.safeParse(value);
  return parsed.success ? parsed.data : "unknown";
}

export function normalizeJiraIssueRow(raw: unknown, index: number): JiraIssueRow {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const parsed = JiraIssueRowSchema.safeParse({
    key: asString(
      obj.key ?? obj.issue_key ?? obj.issueKey,
      `NEW-${index + 1}`
    ),
    summary: asString(
      obj.summary,
      asString(obj.key ?? obj.issue_key, `Issue ${index + 1}`)
    ),
    action: normalizeJiraAction(obj.action),
    status: asString(obj.status) || undefined,
    issueType:
      asString(obj.issueType ?? obj.issue_type ?? obj.type) || undefined,
    assignee: asString(obj.assignee ?? obj.assignedTo) || undefined,
    dueDate: asString(obj.dueDate ?? obj.due_date ?? obj.due) || undefined,
    priority: asString(obj.priority) || undefined,
    url: asString(obj.url) || undefined,
    ...obj,
  });

  if (parsed.success) return parsed.data as JiraIssueRow;

  return {
    key: `NEW-${index + 1}`,
    summary: asString(raw),
    action: "unknown",
  };
}

export function normalizeProjectPlanRow(raw: unknown): ProjectPlanRow {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  if (obj.isMilestone === true) {
    return enrichProjectPlanRow({
      wbsId: asString(obj.wbsId ?? obj.wbs),
      taskName: asString(obj.taskName ?? obj.milestoneTitle),
      taskDesc: asString(obj.taskDesc ?? obj.description),
      start: asString(obj.start),
      end: asString(obj.end),
      duration: asString(obj.duration),
      owner: asString(obj.owner),
      dependency: asString(obj.dependency),
      status: asString(obj.status),
      priority: asString(obj.priority),
      comments: asString(obj.comments),
      isMilestone: true,
      milestoneTitle: asString(obj.milestoneTitle ?? obj.taskName),
    });
  }

  const parsed = ProjectPlanRowSchema.safeParse({
    wbsId:
      asString(
        obj.wbsId ?? obj.wbs_id ?? obj.wbs ?? obj.milestone_id ?? obj.task_id
      ) || undefined,
    taskName: asString(obj.taskName ?? obj.name ?? obj.title) || undefined,
    taskDesc: asString(
      obj.taskDesc ?? obj.task ?? obj.description ?? obj.title
    ),
    start: asString(obj.start ?? obj.start_date),
    end: asString(obj.end ?? obj.end_date),
    duration: asString(obj.duration ?? obj.duration_days),
    owner: asString(obj.owner),
    dependency: asString(
      obj.dependency ?? obj.predecessor ?? obj.dependency_ids
    ),
    status: asString(obj.status) || undefined,
    priority: asString(obj.priority) || undefined,
    comments: asString(obj.comments ?? obj.comment),
    taskNumber:
      typeof obj.taskNumber === "number" ? obj.taskNumber : undefined,
    isMilestone:
      typeof obj.isMilestone === "boolean" ? obj.isMilestone : undefined,
    milestoneTitle: asString(obj.milestoneTitle) || undefined,
  });

  const base = parsed.success
    ? (parsed.data as ProjectPlanRow)
    : ({
        taskDesc: asString(raw),
        start: "",
        end: "",
        duration: "",
        owner: "",
        dependency: "",
        comments: "",
      } satisfies ProjectPlanRow);

  return enrichProjectPlanRow(base);
}

export function normalizeRaidLogRow(raw: unknown): RaidLogRow {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    return normalizeRaidRow({
      id: asString(
        obj.id ??
          obj.risk_id ??
          obj.assumption_id ??
          obj.issue_id ??
          obj.dependency_id
      ),
      category: asString(obj.category) as RaidLogRow["category"],
      description: asString(obj.description),
      owner: asString(obj.owner),
      impact: asString(obj.impact ?? obj.impact_if_invalid ?? obj.impact_if_delayed),
      probability: asString(obj.probability),
      status: asString(obj.status) as RaidLogRow["status"],
      mitigation: asString(
        obj.mitigation ??
          obj.mitigation_strategy ??
          obj.validation_approach ??
          obj.resolution_path
      ),
      targetDate: asString(
        obj.targetDate ??
          obj.identified_date ??
          obj.expected_resolution_date
      ),
      notes: asString(obj.notes ?? obj.contingency_plan),
    } as Partial<RaidLogRow>);
  }
  return normalizeRaidRow({
    description: asString(raw),
    category: "Issue",
  });
}

export function normalizeMeetingMinutes(raw: unknown): MeetingMinutes {
  if (typeof raw === "string") {
    return {
      attendees: [],
      decisions: [],
      actionItems: [],
      risks: [],
      openQuestions: [],
      rawBody: raw.trim(),
    };
  }

  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const meta =
    obj.meeting_metadata && typeof obj.meeting_metadata === "object"
      ? (obj.meeting_metadata as Record<string, unknown>)
      : null;

  const parsed = MeetingMinutesSchema.safeParse({
    title:
      asString(obj.title ?? meta?.meeting_title) || undefined,
    date: asString(obj.date ?? meta?.date) || undefined,
    attendees: asStringArray(obj.attendees),
    summary: asString(obj.summary) || undefined,
    decisions: asStringArray(obj.decisions),
    actionItems: asStringArray(obj.actionItems ?? obj.action_items),
    risks: asStringArray(obj.risks),
    openQuestions: asStringArray(obj.openQuestions ?? obj.open_questions),
    confluenceLink: asString(obj.confluenceLink) || undefined,
    confluenceTitle: asString(obj.confluenceTitle) || undefined,
    rawBody: asString(obj.rawBody ?? obj.body ?? obj.markdown) || undefined,
  });

  if (parsed.success) return parsed.data as MeetingMinutes;

  return {
    attendees: [],
    decisions: [],
    actionItems: [],
    risks: [],
    openQuestions: [],
    rawBody: asString(raw) || undefined,
  };
}

export function normalizeSections(
  raw: unknown
): ParsedAgentResponse["sections"] {
  const parsed = AgentMainSectionsSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  return {
    confluence: asString(obj.confluence),
    jira: asString(obj.jira),
    smartsheet: asString(obj.smartsheet),
    raid: asString(obj.raid),
  };
}

export function emptyParseMeta(): AgentParseMeta {
  return {
    warnings: [],
    sectionKeysFound: [],
    extensionKeysFound: [],
    usedStructuredJson: false,
    parsedAt: new Date().toISOString(),
    counts: { issues: 0, projectPlan: 0, raidLog: 0, momListSections: 0 },
  };
}

export function normalizeParsedResponse(
  input: unknown,
  fallback?: Partial<ParsedAgentResponse>
): ParsedAgentResponse {
  const base =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  const fb = fallback ?? {};
  const sections = normalizeSections(base.sections ?? fb.sections);
  const rawSections =
    base.rawSections && typeof base.rawSections === "object"
      ? Object.fromEntries(
          Object.entries(base.rawSections as Record<string, unknown>).map(
            ([k, v]) => [k, asString(v)]
          )
        )
      : { ...sections, ...(fb.rawSections ?? {}) };

  const meetingMinutes = normalizeMeetingMinutes(
    base.meetingMinutes ?? fb.meetingMinutes
  );

  const issuesRaw = Array.isArray(base.issues) ? base.issues : [];
  const planRaw = Array.isArray(base.projectPlan) ? base.projectPlan : [];
  const raidRaw = Array.isArray(base.raidLog) ? base.raidLog : [];

  const extensions =
    base.extensions && typeof base.extensions === "object"
      ? Object.fromEntries(
          Object.entries(base.extensions as Record<string, unknown>).map(
            ([k, v]) => [k, asString(v)]
          )
        )
      : { ...(fb.extensions ?? {}) };

  const extra =
    base.extra && typeof base.extra === "object" && !Array.isArray(base.extra)
      ? (base.extra as Record<string, unknown>)
      : { ...(fb.extra ?? {}) };

  const draft: ParsedAgentResponse = {
    issues: issuesRaw.map((row, i) => normalizeJiraIssueRow(row, i)),
    projectPlan: enrichProjectPlan(
      planRaw.map((row) => normalizeProjectPlanRow(row))
    ),
    raidLog: ensureRaidLogIds(
      raidRaw.map((row) => normalizeRaidLogRow(row))
    ),
    meetingMinutes,
    confluenceLink: asNullableString(base.confluenceLink ?? fb.confluenceLink),
    rawSections,
    sections,
    sourceMarkdown: asString(base.sourceMarkdown ?? fb.sourceMarkdown),
    extensions,
    extra,
    parseMeta: {
      ...emptyParseMeta(),
      ...(fb.parseMeta ?? {}),
      ...(base.parseMeta && typeof base.parseMeta === "object"
        ? (base.parseMeta as AgentParseMeta)
        : {}),
    },
  };

  const validated = ParsedAgentResponseSchema.safeParse(draft);
  if (validated.success) {
    return validated.data as ParsedAgentResponse;
  }

  draft.parseMeta.warnings.push(
    `Schema validation: ${validated.error.issues
      .slice(0, 5)
      .map((i) => i.message)
      .join("; ")}`
  );

  return draft;
}
