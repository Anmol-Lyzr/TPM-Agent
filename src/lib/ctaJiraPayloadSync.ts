import {
  consolidateIssueTracker,
  issueKeysMatch,
  resolveTrackerIndexForCta,
} from "@/lib/issueTrackerMerge";
import type { CtaJiraAction, ExecuteJiraActionsResult, JiraActionStepResult } from "@/types/jiraActions";
import type { CallToActionEntry, IssueTrackerEntry, MeetingMinutesPayload } from "@/types/meetingPayload";

function appendJiraComment(description: string, comment: string): string {
  const base = description?.trim() ?? "";
  const line = `[Jira] ${comment.trim()}`;
  if (!base) return line;
  if (base.includes(line)) return base;
  return `${base}\n\n${line}`;
}

function applyActionToRow(
  row: IssueTrackerEntry,
  action: CtaJiraAction,
  step: JiraActionStepResult
): IssueTrackerEntry {
  const issueKey = step.issue_key?.trim() || action.issue_key?.trim();
  let next: IssueTrackerEntry = { ...row };

  if (issueKey) {
    next = { ...next, issue_key: issueKey };
  }

  switch (action.operation) {
    case "add_comment": {
      const comment = action.comment_body?.trim();
      if (comment) {
        next.description = appendJiraComment(next.description, comment);
      }
      break;
    }
    case "assign_user": {
      const assignee = action.fields?.assignee?.trim();
      if (assignee) next.assignee = assignee;
      break;
    }
    case "transition_status": {
      const status = action.transition_name?.trim();
      if (status) next.status = status as IssueTrackerEntry["status"];
      break;
    }
    case "update_issue": {
      if (action.fields?.summary?.trim()) next.summary = action.fields.summary.trim();
      if (action.fields?.description?.trim()) {
        next.description = action.fields.description.trim();
      }
      if (action.fields?.priority?.trim()) {
        next.priority = action.fields.priority.trim() as IssueTrackerEntry["priority"];
      }
      if (action.fields?.assignee?.trim()) next.assignee = action.fields.assignee.trim();
      break;
    }
    case "create_issue": {
      const createdKey =
        typeof step.result === "object" &&
        step.result !== null &&
        "key" in step.result &&
        typeof (step.result as { key?: string }).key === "string"
          ? (step.result as { key: string }).key
          : issueKey;
      if (createdKey) next.issue_key = createdKey;
      if (action.fields?.summary?.trim()) next.summary = action.fields.summary.trim();
      break;
    }
    default:
      break;
  }

  return next;
}

/**
 * Mirror successful CTA Jira steps into issue_tracker so the dashboard and DB stay aligned with Jira.
 */
export function applyCtaJiraResultsToPayload(
  payload: MeetingMinutesPayload,
  cta: CallToActionEntry,
  exec: ExecuteJiraActionsResult
): MeetingMinutesPayload {
  const actions = cta.jira_actions ?? [];
  if (!actions.length || !exec.steps.length) return payload;

  const tracker = [...(payload.issue_tracker ?? [])];

  for (let i = 0; i < exec.steps.length; i++) {
    const step = exec.steps[i];
    if (!step.ok) continue;
    const action =
      actions[i]?.operation === step.operation
        ? actions[i]
        : actions.find(
            (item) =>
              item.operation === step.operation &&
              issueKeysMatch(item.issue_key, step.issue_key)
          );
    if (!action) continue;

    const idx = resolveTrackerIndexForCta(tracker, action, step, cta);

    if (idx >= 0) {
      tracker[idx] = applyActionToRow(tracker[idx], action, step);
    } else if (step.issue_key || action.issue_key) {
      const stub: IssueTrackerEntry = {
        issue_key: (step.issue_key ?? action.issue_key).trim(),
        issue_type: "Task",
        summary: action.fields?.summary?.trim() || "Jira issue",
        description: "",
        priority: "Medium",
        status: "Open",
        assignee: action.fields?.assignee?.trim() || "",
        reporter: "",
        sprint: "",
        epic: "",
        labels: [],
        story_points: 0,
        blocked_by: [],
        due_date: "",
        acceptance_criteria: [],
        severity: "Medium",
        module: "",
        root_cause: "",
        steps_to_reproduce: [],
        impact: "",
        workaround: "",
        resolution_plan: "",
        date_opened: "",
        date_resolved: null,
      };
      tracker.push(applyActionToRow(stub, action, step));
    }
  }

  return { ...payload, issue_tracker: consolidateIssueTracker(tracker) };
}

export function extractLatestJiraComment(description: string | undefined): string | null {
  if (!description?.trim()) return null;
  const lines = description.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].startsWith("[Jira]")) {
      return lines[i].replace(/^\[Jira\]\s*/, "").trim() || null;
    }
  }
  return null;
}
