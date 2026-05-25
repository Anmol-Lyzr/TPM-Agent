"use client";

import { useEffect, useState } from "react";
import { Bug, Pencil, Save } from "lucide-react";
import type { IssueTrackerEntry } from "@/types/meetingPayload";
import { extractLatestJiraComment } from "@/lib/ctaJiraPayloadSync";
import { EmptyState } from "@/components/ui/EmptyState";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const ISSUE_TYPES: IssueTrackerEntry["issue_type"][] = ["Bug", "Story", "Task", "Epic"];
const ISSUE_STATUSES: IssueTrackerEntry["status"][] = [
  "Open",
  "To Do",
  "In Progress",
  "Done",
  "Blocked",
  "Resolved",
  "Closed",
];
const PRIORITIES: IssueTrackerEntry["priority"][] = ["Low", "Medium", "High", "Critical"];

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function listValue(value: string[] | undefined): string {
  return (value ?? []).join(", ");
}

function priorityTone(priority: string): string {
  if (priority === "Critical") return "bg-red-100 text-red-700 ring-red-200";
  if (priority === "High") return "bg-orange-100 text-orange-700 ring-orange-200";
  if (priority === "Medium") return "bg-amber-100 text-amber-700 ring-amber-200";
  return "bg-muted text-muted-foreground ring-border";
}

type Props = {
  issues: IssueTrackerEntry[];
  isLoading?: boolean;
  isEmpty: boolean;
  embedded?: boolean;
  editable?: boolean;
  ownerOptions?: string[];
  onChange?: (next: IssueTrackerEntry[]) => void;
  onApplyEdit?: (next: IssueTrackerEntry[], issue: IssueTrackerEntry) => Promise<void> | void;
};

export function IssueTracker({
  issues,
  isLoading = false,
  isEmpty,
  embedded = false,
  editable = false,
  ownerOptions = [],
  onChange,
  onApplyEdit,
}: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftIssue, setDraftIssue] = useState<IssueTrackerEntry | null>(null);
  const selectedIssue = editingIndex === null ? null : issues[editingIndex] ?? null;

  useEffect(() => {
    if (!selectedIssue) {
      setDraftIssue(null);
      return;
    }
    setDraftIssue({ ...selectedIssue });
  }, [selectedIssue]);

  const setDraftField = <K extends keyof IssueTrackerEntry>(key: K, value: IssueTrackerEntry[K]) => {
    setDraftIssue((current) => (current ? { ...current, [key]: value } : current));
  };

  const [applyError, setApplyError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const saveDraftIssue = async () => {
    if (!onChange || editingIndex === null || !draftIssue) return;
    const next = issues.map((issue, idx) => (idx === editingIndex ? draftIssue : issue));
    setApplyError(null);
    setIsApplying(true);
    try {
      if (onApplyEdit) {
        await onApplyEdit(next, draftIssue);
      } else {
        onChange(next);
      }
      setEditingIndex(null);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Failed to save ticket changes");
    } finally {
      setIsApplying(false);
    }
  };

  const closeEditor = () => {
    if (isApplying) return;
    setEditingIndex(null);
    setApplyError(null);
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
            <th className="px-2 py-2 font-medium">Latest Jira note</th>
            {editable ? (
              <th className="w-9 px-1 py-2 text-right font-medium">
                <span className="sr-only">Edit ticket</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {issues.map((issue, idx) => (
            <tr key={`${issue.issue_key}-${idx}`} className="border-b border-border/30 hover:bg-black/[0.02]">
              <td className="px-2 py-2.5 font-mono font-semibold text-primary">
                {issue.issue_key || "—"}
              </td>
              <td className="px-2 py-2.5">
                {issue.issue_type || "—"}
              </td>
              <td className="min-w-[220px] max-w-[340px] px-2 py-2.5 text-foreground">
                <span className="line-clamp-2">{issue.summary || "—"}</span>
              </td>
              <td className="px-2 py-2.5">
                {issue.status || "—"}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">
                {issue.assignee || "—"}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">
                {issue.due_date || "—"}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">
                <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ${priorityTone(issue.priority)}`}>
                  {issue.priority || "—"}
                </span>
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">
                {issue.severity || "—"}
              </td>
              <td className="max-w-[200px] px-2 py-2.5 text-muted-foreground">
                <span className="line-clamp-2" title={issue.description || undefined}>
                  {extractLatestJiraComment(issue.description) ?? "—"}
                </span>
              </td>
              {editable ? (
                <td className="w-9 px-1 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => setEditingIndex(idx)}
                    title={`Edit ${issue.issue_key || "ticket"}`}
                    aria-label={`Edit ${issue.issue_key || "ticket"}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      <Sheet open={editingIndex !== null} onOpenChange={(open) => { if (!open) closeEditor(); }}>
        <SheetContent side="right" className="flex w-full flex-col overflow-hidden p-0 sm:max-w-3xl">
          {draftIssue ? (
            <>
              <SheetHeader className="border-b border-border/50 px-6 py-5">
                <div className="flex flex-wrap items-center gap-2 pr-8">
                  <span className="rounded bg-primary/10 px-2 py-1 font-mono text-xs font-semibold text-primary">
                    {draftIssue.issue_key || "New issue"}
                  </span>
                  <span className={`rounded px-2 py-1 text-xs font-semibold ring-1 ${priorityTone(draftIssue.priority)}`}>
                    {draftIssue.priority}
                  </span>
                </div>
                <SheetTitle className="text-left text-xl">Edit Jira ticket</SheetTitle>
                <SheetDescription className="text-left">
                  Update the fields here, then save this ticket directly to the app and Jira.
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                <section className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Core fields</h4>
                  <label className="block text-xs font-medium text-muted-foreground">
                    Summary
                    <input
                      value={draftIssue.summary}
                      onChange={(e) => setDraftField("summary", e.target.value)}
                      className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                    />
                  </label>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Type
                      <select
                        value={draftIssue.issue_type}
                        onChange={(e) => setDraftField("issue_type", e.target.value as IssueTrackerEntry["issue_type"])}
                        className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                      >
                        {ISSUE_TYPES.map((type) => <option key={type}>{type}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Status
                      <select
                        value={draftIssue.status}
                        onChange={(e) => setDraftField("status", e.target.value as IssueTrackerEntry["status"])}
                        className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                      >
                        {ISSUE_STATUSES.map((status) => <option key={status}>{status}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Due date
                      <input
                        type="date"
                        value={draftIssue.due_date}
                        onChange={(e) => setDraftField("due_date", e.target.value)}
                        className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Assignee
                      <select
                        value={draftIssue.assignee}
                        onChange={(e) => setDraftField("assignee", e.target.value)}
                        className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                      >
                        <option value="">Unassigned</option>
                        {ownerOptions.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Priority
                      <select
                        value={draftIssue.priority}
                        onChange={(e) => setDraftField("priority", e.target.value as IssueTrackerEntry["priority"])}
                        className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                      >
                        {PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Severity
                      <select
                        value={draftIssue.severity}
                        onChange={(e) => setDraftField("severity", e.target.value as IssueTrackerEntry["severity"])}
                        className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                      >
                        {PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
                      </select>
                    </label>
                  </div>
                </section>

                <section className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</h4>
                  <label className="block text-xs font-medium text-muted-foreground">
                    Description
                    <textarea
                      value={draftIssue.description}
                      onChange={(e) => setDraftField("description", e.target.value)}
                      rows={6}
                      className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                    />
                  </label>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Impact
                      <textarea
                        value={draftIssue.impact}
                        onChange={(e) => setDraftField("impact", e.target.value)}
                        rows={4}
                        className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                      />
                    </label>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Resolution plan
                      <textarea
                        value={draftIssue.resolution_plan}
                        onChange={(e) => setDraftField("resolution_plan", e.target.value)}
                        rows={4}
                        className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                      />
                    </label>
                  </div>
                  <label className="block text-xs font-medium text-muted-foreground">
                    Workaround
                    <input
                      value={draftIssue.workaround}
                      onChange={(e) => setDraftField("workaround", e.target.value)}
                      className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                    />
                  </label>
                </section>

                <section className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Planning metadata</h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Module
                      <input
                        value={draftIssue.module}
                        onChange={(e) => setDraftField("module", e.target.value)}
                        className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                      />
                    </label>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Sprint
                      <input
                        value={draftIssue.sprint}
                        onChange={(e) => setDraftField("sprint", e.target.value)}
                        className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                      />
                    </label>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Story points
                      <input
                        type="number"
                        min={0}
                        value={draftIssue.story_points}
                        onChange={(e) => setDraftField("story_points", Number(e.target.value) || 0)}
                        className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Labels
                      <input
                        value={listValue(draftIssue.labels)}
                        onChange={(e) => setDraftField("labels", splitList(e.target.value))}
                        placeholder="bug, oauth, mobile-safari"
                        className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                      />
                    </label>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Blocked by
                      <input
                        value={listValue(draftIssue.blocked_by)}
                        onChange={(e) => setDraftField("blocked_by", splitList(e.target.value))}
                        placeholder="HM-21, HM-22"
                        className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                      />
                    </label>
                  </div>
                  <label className="block text-xs font-medium text-muted-foreground">
                    Acceptance criteria
                    <textarea
                      value={listValue(draftIssue.acceptance_criteria)}
                      onChange={(e) => setDraftField("acceptance_criteria", splitList(e.target.value))}
                      rows={3}
                      placeholder="Comma-separated criteria"
                      className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                    />
                  </label>
                </section>
              </div>

              <SheetFooter className="flex-wrap gap-2 border-t border-border/50 bg-background/95 px-6 py-4">
                {applyError ? (
                  <div className="w-full rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-left text-xs text-destructive">
                    {applyError}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={isApplying}
                  className="rounded-md border border-border/60 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveDraftIssue()}
                  disabled={isApplying}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Save className={`h-4 w-4 ${isApplying ? "animate-pulse" : ""}`} />
                  {onApplyEdit ? (isApplying ? "Saving to Jira..." : "Save & sync ticket") : "Apply ticket changes"}
                </button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
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
