import {
  assignJiraIssue,
  createJiraIssue,
  createJiraIssueComment,
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

function fieldHasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return value > 0;
  if (Array.isArray(value)) return value.length > 0;
  return false;
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
