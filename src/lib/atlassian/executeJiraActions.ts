import {
  assignJiraIssue,
  createJiraIssue,
  createJiraIssueComment,
  fetchJiraIssues,
  type AtlassianStatus,
  getIssueTransitions,
  getTpmBackendUrl,
  linkJiraIssues,
  transitionJiraIssue,
  updateJiraIssue,
} from "@/lib/atlassian/client";
import { resolveJiraAccountId } from "@/lib/atlassian/jiraFields";
import { textToAdf } from "@/lib/atlassian/jiraAdf";
import type {
  CtaJiraAction,
  ExecuteJiraActionsResult,
  JiraActionFields,
  JiraActionStepResult,
} from "@/types/jiraActions";
import type { MeetingMinutesPayload } from "@/types/meetingPayload";

function fieldHasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return value > 0;
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

function cloneAction(action: CtaJiraAction): CtaJiraAction {
  return {
    ...action,
    fields: { ...(action.fields ?? {}) } as JiraActionFields,
  };
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function hasProjectPrefix(issueKey: string, projectKey?: string): boolean {
  if (!projectKey?.trim()) return false;
  return issueKey.trim().toUpperCase().startsWith(`${projectKey.trim().toUpperCase()}-`);
}

function needsResolution(issueKey: string | undefined, projectKey?: string): boolean {
  const key = issueKey?.trim();
  return Boolean(key && projectKey?.trim() && !hasProjectPrefix(key, projectKey));
}

function findPayloadSummary(
  syntheticIssueKey: string,
  payload?: MeetingMinutesPayload | null
): string | undefined {
  const key = syntheticIssueKey.trim().toLowerCase();
  return payload?.issue_tracker
    ?.find((issue) => issue.issue_key?.trim().toLowerCase() === key)
    ?.summary?.trim();
}

async function buildRealJiraKeyBySummary(projectKey: string): Promise<Map<string, string>> {
  const data = await fetchJiraIssues(`project = ${projectKey} ORDER BY created DESC`);
  const map = new Map<string, string>();
  for (const issue of data.issues ?? []) {
    const summary = normalizeText(issue.fields?.summary);
    const key = issue.key?.trim();
    if (summary && key) map.set(summary, key);
  }
  return map;
}

async function resolveIssueKey(
  issueKey: string | undefined,
  options: {
    payload?: MeetingMinutesPayload | null;
    projectKey?: string;
    realKeyBySummary?: Map<string, string>;
  }
): Promise<string | undefined> {
  const key = issueKey?.trim();
  if (!key) return undefined;
  if (!needsResolution(key, options.projectKey)) return key;

  const summary = findPayloadSummary(key, options.payload);
  const resolved = summary ? options.realKeyBySummary?.get(normalizeText(summary)) : undefined;
  if (resolved) {
    console.info(`[cta/jira-actions] resolved issue_key ${key} → ${resolved}`);
    return resolved;
  }

  throw new Error(
    `Could not resolve generated issue key ${key} to a real Jira key in project ${options.projectKey}. ` +
      "Check that the Jira issue exists and its summary still matches the generated issue tracker row."
  );
}

export async function resolveCtaJiraActionIssueKeys(
  actions: CtaJiraAction[],
  options: {
    payload?: MeetingMinutesPayload | null;
    status?: AtlassianStatus;
  }
): Promise<CtaJiraAction[]> {
  const projectKey = options.status?.jiraProjectKey?.trim();
  const needsLookup = actions.some(
    (action) =>
      needsResolution(action.issue_key, projectKey) ||
      needsResolution(action.linked_issue_key, projectKey)
  );
  const realKeyBySummary =
    needsLookup && projectKey ? await buildRealJiraKeyBySummary(projectKey) : undefined;

  const resolved: CtaJiraAction[] = [];
  for (const action of actions) {
    const next = cloneAction(action);
    const nextIssueKey = await resolveIssueKey(next.issue_key, {
      payload: options.payload,
      projectKey,
      realKeyBySummary,
    });
    if (nextIssueKey) next.issue_key = nextIssueKey;

    const nextLinkedIssueKey = await resolveIssueKey(next.linked_issue_key, {
      payload: options.payload,
      projectKey,
      realKeyBySummary,
    });
    if (nextLinkedIssueKey) next.linked_issue_key = nextLinkedIssueKey;

    resolved.push(next);
  }

  return resolved;
}

async function buildJiraFields(
  fields: JiraActionFields,
  projectKey?: string
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  if (projectKey?.trim()) out.project = { key: projectKey.trim() };
  if (fieldHasValue(fields.summary)) out.summary = fields.summary.trim();
  if (fieldHasValue(fields.description)) out.description = textToAdf(fields.description.trim());
  if (fieldHasValue(fields.issuetype)) out.issuetype = { name: fields.issuetype.trim() };
  if (fieldHasValue(fields.priority)) out.priority = { name: fields.priority.trim() };
  if (fieldHasValue(fields.assignee)) {
    out.assignee = { accountId: await resolveJiraAccountId(fields.assignee) };
  }
  if (fieldHasValue(fields.reporter)) {
    out.reporter = { accountId: await resolveJiraAccountId(fields.reporter) };
  }
  if (fieldHasValue(fields.labels)) out.labels = fields.labels;
  if (fieldHasValue(fields.duedate)) out.duedate = fields.duedate.trim();
  if (fieldHasValue(fields.parent_key)) out.parent = { key: fields.parent_key.trim() };
  if (fieldHasValue(fields.components)) {
    out.components = fields.components.map((name) => ({ name }));
  }
  if (fieldHasValue(fields.fix_versions)) {
    out.fixVersions = fields.fix_versions.map((name) => ({ name }));
  }
  return out;
}

async function executeOneAction(action: CtaJiraAction): Promise<unknown> {
  const issueKey = action.issue_key?.trim();

  switch (action.operation) {
    case "create_issue": {
      const projectKey = action.project_key?.trim();
      if (!projectKey) throw new Error("create_issue requires project_key");
      const fields = await buildJiraFields(action.fields, projectKey);
      if (!fields.summary) throw new Error("create_issue requires fields.summary");
      if (!fields.issuetype) throw new Error("create_issue requires fields.issuetype");
      return createJiraIssue({ fields });
    }

    case "update_issue": {
      if (!issueKey) throw new Error("update_issue requires issue_key");
      const fields = await buildJiraFields(action.fields);
      if (!Object.keys(fields).length) throw new Error("update_issue requires at least one field");
      return updateJiraIssue(issueKey, { fields });
    }

    case "assign_user": {
      if (!issueKey) throw new Error("assign_user requires issue_key");
      const name = action.fields?.assignee?.trim();
      if (!name) throw new Error("assign_user requires fields.assignee");
      const accountId = await resolveJiraAccountId(name);
      return assignJiraIssue(issueKey, accountId);
    }

    case "add_comment": {
      if (!issueKey) throw new Error("add_comment requires issue_key");
      const text = action.comment_body?.trim();
      if (!text) throw new Error("add_comment requires comment_body");
      return createJiraIssueComment(issueKey, { body: textToAdf(text) });
    }

    case "transition_status": {
      if (!issueKey) throw new Error("transition_status requires issue_key");
      const targetName = action.transition_name?.trim();
      if (!targetName) throw new Error("transition_status requires transition_name");
      const transitions = await getIssueTransitions(issueKey);
      const match = transitions.transitions?.find(
        (t) => t.name.toLowerCase() === targetName.toLowerCase()
      );
      if (!match?.id) {
        throw new Error(`No Jira transition named "${targetName}" for ${issueKey}`);
      }
      return transitionJiraIssue(issueKey, match.id);
    }

    case "link_issues": {
      if (!issueKey) throw new Error("link_issues requires issue_key");
      const linked = action.linked_issue_key?.trim();
      const linkType = action.link_type?.trim();
      if (!linked || !linkType) {
        throw new Error("link_issues requires link_type and linked_issue_key");
      }
      return linkJiraIssues({
        type: { name: linkType },
        inwardIssue: { key: issueKey },
        outwardIssue: { key: linked },
      });
    }

    default:
      throw new Error(`Unknown Jira operation: ${(action as CtaJiraAction).operation}`);
  }
}

/**
 * Run CTA jira_actions in order via TPM Backend `/api/atlassian/*` routes.
 * Aborts on first failure (operations are meant to land together).
 */
export async function executeCtaJiraActions(
  actions: CtaJiraAction[]
): Promise<ExecuteJiraActionsResult> {
  const steps: JiraActionStepResult[] = [];
  const errors: string[] = [];

  if (!actions.length) {
    return { ok: true, steps, errors };
  }

  console.info(
    `[cta/jira-actions] executing ${actions.length} action(s) via ${getTpmBackendUrl()}`
  );

  for (const action of actions) {
    console.info(
      `[cta/jira-actions] step operation=${action.operation} issue_key=${action.issue_key || "—"}`
    );
    try {
      const result = await executeOneAction(action);
      steps.push({
        operation: action.operation,
        issue_key: action.issue_key?.trim() || undefined,
        ok: true,
        result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Jira action failed";
      steps.push({
        operation: action.operation,
        issue_key: action.issue_key?.trim() || undefined,
        ok: false,
        error: message,
      });
      errors.push(`${action.operation}${action.issue_key ? ` (${action.issue_key})` : ""}: ${message}`);
      break;
    }
  }

  return {
    ok: steps.length > 0 && steps.every((s) => s.ok) && errors.length === 0,
    steps,
    errors,
  };
}
