"use client";

import { Bug, ExternalLink } from "lucide-react";
import type { JiraIssueRow } from "@/types/tpm";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { MomMarkdown } from "@/components/panels/MomMarkdown";
import { PanelExportActions } from "@/components/ui/PanelExportActions";
import {
  canExportIssues,
  exportIssueTrackerDocument,
  exportIssueTrackerExcel,
} from "@/lib/panelExports";

const cellInput =
  "w-full min-w-0 rounded border border-border/50 bg-background/60 px-1.5 py-1 text-xs focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20";

type Props = {
  issues: JiraIssueRow[];
  sectionMarkdown?: string;
  isLoading?: boolean;
  isEmpty: boolean;
  embedded?: boolean;
  isEditing?: boolean;
  onDraftChange?: (issues: JiraIssueRow[]) => void;
};

export function IssueTracker({
  issues,
  sectionMarkdown,
  isLoading = false,
  isEmpty,
  embedded = false,
  isEditing = false,
  onDraftChange,
}: Props) {
  const showMarkdown = issues.length === 0 && Boolean(sectionMarkdown);
  const canExport =
    canExportIssues(issues, sectionMarkdown) && !isEmpty && !isLoading;

  const updateIssue = (index: number, patch: Partial<JiraIssueRow>) => {
    if (!onDraftChange) return;
    onDraftChange(issues.map((issue, i) => (i === index ? { ...issue, ...patch } : issue)));
  };

  const content = isEmpty ? (
    <EmptyState
      icon={Bug}
      title="No Jira issues yet"
      description="The JIRA task table from the agent will appear here after analysis."
    />
  ) : showMarkdown && sectionMarkdown ? (
    <div className="h-full overflow-auto p-3">
      <MomMarkdown content={sectionMarkdown} />
    </div>
  ) : (
    <div className="h-full overflow-auto p-2">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-border/50 text-muted-foreground">
            <th className="px-2 py-2 font-medium">Type</th>
            <th className="px-2 py-2 font-medium">Key</th>
            <th className="px-2 py-2 font-medium">Summary</th>
            <th className="px-2 py-2 font-medium">Status</th>
            <th className="px-2 py-2 font-medium">Assignee</th>
            <th className="px-2 py-2 font-medium">Due</th>
            <th className="px-2 py-2 font-medium">Priority</th>
            <th className="px-2 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {issues.map((issue, idx) => (
            <tr key={`${issue.key}-${idx}`} className="border-b border-border/30 hover:bg-black/[0.02]">
              <td className="px-2 py-2.5">
                {isEditing ? (
                  <input
                    value={issue.issueType ?? ""}
                    onChange={(e) =>
                      updateIssue(idx, { issueType: e.target.value })
                    }
                    className={cellInput}
                    placeholder="Bug, Task…"
                  />
                ) : issue.issueType ? (
                  <Badge
                    variant={
                      /bug|defect/i.test(issue.issueType) ? "danger" : "default"
                    }
                  >
                    {issue.issueType}
                  </Badge>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-2 py-2.5">
                {isEditing ? (
                  <input
                    value={issue.key}
                    onChange={(e) => updateIssue(idx, { key: e.target.value })}
                    className={cellInput}
                  />
                ) : (
                  <span
                    className={
                      issue.key.startsWith("NEW-")
                        ? "text-muted-foreground/60"
                        : "font-mono font-semibold text-primary"
                    }
                  >
                    {issue.key.startsWith("NEW-") ? "—" : issue.key}
                  </span>
                )}
              </td>
              <td className="max-w-[180px] px-2 py-2.5 text-foreground">
                {isEditing ? (
                  <textarea
                    value={issue.summary}
                    onChange={(e) => updateIssue(idx, { summary: e.target.value })}
                    rows={2}
                    className={cellInput}
                  />
                ) : (
                  issue.summary
                )}
              </td>
              <td className="px-2 py-2.5">
                {isEditing ? (
                  <input
                    value={issue.status ?? issue.action}
                    onChange={(e) => updateIssue(idx, { status: e.target.value })}
                    className={cellInput}
                  />
                ) : (
                  <Badge variant="unknown">{issue.status ?? issue.action}</Badge>
                )}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">
                {isEditing ? (
                  <input
                    value={issue.assignee ?? ""}
                    onChange={(e) => updateIssue(idx, { assignee: e.target.value })}
                    className={cellInput}
                  />
                ) : (
                  issue.assignee || "—"
                )}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">
                {isEditing ? (
                  <input
                    value={issue.dueDate ?? ""}
                    onChange={(e) => updateIssue(idx, { dueDate: e.target.value })}
                    className={cellInput}
                  />
                ) : (
                  issue.dueDate || "—"
                )}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">
                {isEditing ? (
                  <input
                    value={issue.priority ?? ""}
                    onChange={(e) => updateIssue(idx, { priority: e.target.value })}
                    className={cellInput}
                  />
                ) : (
                  issue.priority || "—"
                )}
              </td>
              <td className="px-2 py-2.5">
                {!isEditing && issue.url ? (
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground/50 hover:text-primary"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
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
        subtitle="JIRA task list"
        count={issues.length || undefined}
        actions={
          <PanelExportActions
            disabled={!canExport}
            onExportExcel={() => exportIssueTrackerExcel(issues, sectionMarkdown)}
            onExportDocument={() =>
              exportIssueTrackerDocument(issues, sectionMarkdown)
            }
          />
        }
      />
      <div className="relative flex-1 overflow-hidden">
        {isLoading ? <LoadingOverlay /> : null}
        {content}
      </div>
    </article>
  );
}
