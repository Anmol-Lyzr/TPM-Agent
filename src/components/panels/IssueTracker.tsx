"use client";

import { Bug } from "lucide-react";
import type { IssueTrackerEntry } from "@/types/meetingPayload";
import { EmptyState } from "@/components/ui/EmptyState";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

type Props = {
  issues: IssueTrackerEntry[];
  isLoading?: boolean;
  isEmpty: boolean;
  embedded?: boolean;
  editable?: boolean;
  ownerOptions?: string[];
  onChange?: (next: IssueTrackerEntry[]) => void;
};

export function IssueTracker({
  issues,
  isLoading = false,
  isEmpty,
  embedded = false,
  editable = false,
  ownerOptions = [],
  onChange,
}: Props) {
  const updateIssue = (idx: number, key: keyof IssueTrackerEntry, value: string) => {
    if (!onChange) return;
    const next = issues.map((issue, i) => {
      if (i !== idx) return issue;
      if (key === "labels" || key === "blocked_by" || key === "acceptance_criteria" || key === "steps_to_reproduce") {
        return { ...issue, [key]: value.split(",").map((v) => v.trim()).filter(Boolean) } as IssueTrackerEntry;
      }
      if (key === "story_points") return { ...issue, story_points: Number(value) || 0 };
      return { ...issue, [key]: value } as IssueTrackerEntry;
    });
    onChange(next);
  };

  const content = isEmpty ? (
    <EmptyState
      icon={Bug}
      title="No issues yet"
      description="The issue tracker from the agent will appear here after analysis."
    />
  ) : (
    <div className="h-full overflow-auto p-2">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-border/50 text-muted-foreground">
            <th className="px-2 py-2 font-medium">Key</th>
            <th className="px-2 py-2 font-medium">Type</th>
            <th className="px-2 py-2 font-medium">Summary</th>
            <th className="px-2 py-2 font-medium">Status</th>
            <th className="px-2 py-2 font-medium">Assignee</th>
            <th className="px-2 py-2 font-medium">Due Date</th>
            <th className="px-2 py-2 font-medium">Priority</th>
            <th className="px-2 py-2 font-medium">Severity</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue, idx) => (
            <tr key={`${issue.issue_key}-${idx}`} className="border-b border-border/30 hover:bg-black/[0.02]">
              <td className="px-2 py-2.5 font-mono font-semibold text-primary">
                {issue.issue_key || "—"}
              </td>
              <td className="px-2 py-2.5">
                {editable ? (
                  <select value={issue.issue_type} onChange={(e) => updateIssue(idx, "issue_type", e.target.value)} className="rounded border border-border/40 bg-background/60 px-2 py-1 text-xs">
                    <option>Bug</option><option>Story</option><option>Task</option><option>Epic</option>
                  </select>
                ) : (
                  issue.issue_type || "—"
                )}
              </td>
              <td className="max-w-[180px] px-2 py-2.5 text-foreground">
                {editable ? (
                  <input value={issue.summary} onChange={(e) => updateIssue(idx, "summary", e.target.value)} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" />
                ) : (
                  issue.summary || "—"
                )}
              </td>
              <td className="px-2 py-2.5">
                {editable ? (
                  <select value={issue.status} onChange={(e) => updateIssue(idx, "status", e.target.value)} className="rounded border border-border/40 bg-background/60 px-2 py-1 text-xs">
                    <option>Open</option><option>To Do</option><option>In Progress</option><option>Done</option><option>Blocked</option><option>Resolved</option><option>Closed</option>
                  </select>
                ) : (
                  issue.status || "—"
                )}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">
                {editable ? (
                  <select value={issue.assignee} onChange={(e) => updateIssue(idx, "assignee", e.target.value)} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs">
                    <option value="">Select owner</option>
                    {ownerOptions.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
                  </select>
                ) : (
                  issue.assignee || "—"
                )}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">
                {editable ? (
                  <input type="date" value={issue.due_date} onChange={(e) => updateIssue(idx, "due_date", e.target.value)} className="rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" />
                ) : (
                  issue.due_date || "—"
                )}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">
                {editable ? (
                  <select value={issue.priority} onChange={(e) => updateIssue(idx, "priority", e.target.value)} className="rounded border border-border/40 bg-background/60 px-2 py-1 text-xs">
                    <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                  </select>
                ) : (
                  issue.priority || "—"
                )}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">
                {editable ? (
                  <select value={issue.severity} onChange={(e) => updateIssue(idx, "severity", e.target.value)} className="rounded border border-border/40 bg-background/60 px-2 py-1 text-xs">
                    <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                  </select>
                ) : (
                  issue.severity || "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (embedded) {
    return <div className="h-full overflow-hidden">{content}</div>;
  }

  return (
    <article className="glass-card relative flex min-h-[280px] flex-col overflow-hidden rounded-xl">
      <PanelHeader
        icon={Bug}
        title="Issue Tracker"
        subtitle="JIRA issues & bugs"
        count={issues.length || undefined}
      />
      <div className="relative flex-1 overflow-hidden">
        {isLoading ? <LoadingOverlay /> : null}
        {content}
      </div>
    </article>
  );
}
