"use client";

import { Bug } from "lucide-react";
import type { IssueTrackerEntry } from "@/types/meetingPayload";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

type Props = {
  issues: IssueTrackerEntry[];
  isLoading?: boolean;
  isEmpty: boolean;
  embedded?: boolean;
};

function issueTypeBadgeVariant(issueType: string): "danger" | "warning" | "default" {
  if (/bug|defect/i.test(issueType)) return "danger";
  if (/epic/i.test(issueType)) return "warning";
  return "default";
}

export function IssueTracker({
  issues,
  isLoading = false,
  isEmpty,
  embedded = false,
}: Props) {
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
                {issue.issue_type ? (
                  <Badge variant={issueTypeBadgeVariant(issue.issue_type)}>
                    {issue.issue_type}
                  </Badge>
                ) : (
                  "—"
                )}
              </td>
              <td className="max-w-[180px] px-2 py-2.5 text-foreground">
                {issue.summary || "—"}
              </td>
              <td className="px-2 py-2.5">
                {issue.status ? (
                  <Badge variant="unknown">{issue.status}</Badge>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">
                {issue.assignee || "—"}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">
                {issue.due_date || "—"}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">
                {issue.priority || "—"}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">
                {issue.severity || "—"}
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
