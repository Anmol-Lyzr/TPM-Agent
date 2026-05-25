"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Download, Loader2, Pencil, Save, Sparkles, X } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { ProjectPlanTable } from "@/components/panels/ProjectPlanTable";
import { IssueTracker } from "@/components/panels/IssueTracker";
import { RaidLogPanel } from "@/components/panels/RaidLogPanel";
import { MeetingMinutes } from "@/components/panels/MeetingMinutes";
import { ProjectAnalyticsSection } from "@/components/dashboard/ProjectAnalyticsSection";
import { DASHBOARD_TABS } from "@/lib/dashboardState";
import { isBugIssue } from "@/lib/analytics";
import { postAgentJob, pollAgentJob } from "@/lib/agentClient";
import { buildAssigneeOptions } from "@/lib/assigneeOptions";
import { formatAtlassianSyncMessage } from "@/lib/atlassian/formatSyncMessage";
import { isValidJiraIssueKey } from "@/lib/atlassian/jiraFields";
import { fetchJiraIssues, fetchJiraUsers, type JiraIssue, type JiraUser } from "@/lib/atlassianClient";
import { executeCtaJiraActionsForCta } from "@/lib/ctaClient";
import { applyCtaJiraResultsToPayload } from "@/lib/ctaJiraPayloadSync";
import { mergeIssueTrackerWithJira } from "@/lib/issueTrackerMerge";
import { saveSession } from "@/lib/sessionStore";
import {
  downloadProjectPlanExcel,
  downloadIssueTrackerExcel,
  downloadRaidLogExcel,
  downloadMomDocx,
} from "@/lib/downloadUtils";
import type { CallToActionEntry, IssueTrackerEntry } from "@/types/meetingPayload";
import type { DashboardTabId } from "@/types/tpm";
import type { MeetingMinutesPayload } from "@/types/meetingPayload";

type CtaStatus = "Pending" | "Approved" | "Executed" | "Dismissed";
type CtaCategory =
  | "Blockers & Escalations"
  | "Deadline & Schedule Alerts"
  | "Accountability & Ownership"
  | "Meeting & MoM Follow-ups"
  | "Health & Progress Anomalies";

const CTA_CATEGORIES: CtaCategory[] = [
  "Blockers & Escalations",
  "Deadline & Schedule Alerts",
  "Accountability & Ownership",
  "Meeting & MoM Follow-ups",
  "Health & Progress Anomalies",
];

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function DashboardTabs({
  payload,
  isLoading,
  hasRun: _hasRun,
  showEmpty,
  sessionId,
  onRefine: _onRefine,
  onPayloadUpdated,
  initialTab,
  issueFilter = "all",
}: {
  payload: MeetingMinutesPayload | null;
  isLoading: boolean;
  hasRun: boolean;
  showEmpty: boolean;
  sessionId: string | null;
  onRefine?: (prompt: string, activeTab: DashboardTabId, snapshot: unknown) => Promise<void>;
  onPayloadUpdated?: (payload: MeetingMinutesPayload) => void;
  initialTab?: DashboardTabId;
  issueFilter?: "all" | "bug";
}) {
  void _hasRun;
  void _onRefine;
  const [activeTab, setActiveTab] = useState<DashboardTabId>(initialTab ?? "plan");
  const [draftPayload, setDraftPayload] = useState<MeetingMinutesPayload | null>(payload);
  const [isDirty, setIsDirty] = useState(false);
  const [isSavingPayload, setIsSavingPayload] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [isEditingAll, setIsEditingAll] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<CtaCategory | null>(null);
  const [expandedCtaId, setExpandedCtaId] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, CtaStatus>>({});
  const [ctaSavingId, setCtaSavingId] = useState<string | null>(null);
  const [ctaError, setCtaError] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [dirtyIssueKeys, setDirtyIssueKeys] = useState<string[]>([]);
  const [jiraIssues, setJiraIssues] = useState<JiraIssue[]>([]);
  const [jiraUsers, setJiraUsers] = useState<JiraUser[]>([]);
  const [isLoadingJiraIssues, setIsLoadingJiraIssues] = useState(false);
  const [isLoadingJiraUsers, setIsLoadingJiraUsers] = useState(false);
  const [jiraIssueError, setJiraIssueError] = useState<string | null>(null);
  const [jiraUserError, setJiraUserError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const effectivePayload = useMemo(() => {
    if (!draftPayload) return null;
    if (!draftPayload.call_to_actions?.length) return draftPayload;
    return {
      ...draftPayload,
      call_to_actions: draftPayload.call_to_actions.map((cta) => ({
        ...cta,
        status: statusOverrides[cta.cta_id] ?? cta.status,
      })),
    };
  }, [draftPayload, statusOverrides]);

  const reloadJiraIssues = useCallback(async () => {
    setIsLoadingJiraIssues(true);
    setJiraIssueError(null);
    try {
      const data = await fetchJiraIssues();
      setJiraIssues(data.issues ?? []);
    } catch (err) {
      setJiraIssueError(
        err instanceof Error ? err.message : "Failed to load Jira issues"
      );
    } finally {
      setIsLoadingJiraIssues(false);
    }
  }, []);

  const reloadJiraData = useCallback(async () => {
    setIsLoadingJiraIssues(true);
    setIsLoadingJiraUsers(true);
    setJiraIssueError(null);
    setJiraUserError(null);
    const [issuesResult, usersResult] = await Promise.allSettled([
      fetchJiraIssues(),
      fetchJiraUsers(),
    ]);
    if (issuesResult.status === "fulfilled") {
      setJiraIssues(issuesResult.value.issues ?? []);
    } else {
      setJiraIssueError(
        issuesResult.reason instanceof Error
          ? issuesResult.reason.message
          : "Failed to load Jira issues"
      );
    }
    if (usersResult.status === "fulfilled") {
      setJiraUsers(usersResult.value.users ?? []);
    } else {
      setJiraUserError(
        usersResult.reason instanceof Error
          ? usersResult.reason.message
          : "Failed to load Atlassian users"
      );
    }
    setIsLoadingJiraIssues(false);
    setIsLoadingJiraUsers(false);
  }, []);

  useEffect(() => {
    if (activeTab !== "issues") return;
    void reloadJiraData();
  }, [activeTab, reloadJiraData]);

  const issueRows = useMemo(() => {
    const generatedIssues = effectivePayload?.issue_tracker ?? [];
    return mergeIssueTrackerWithJira(generatedIssues, jiraIssues);
  }, [effectivePayload, jiraIssues]);

  const filteredIssues = useMemo(() => {
    const issues = issueRows;
    if (issueFilter !== "bug") return issues;
    return issues.filter((issue) => isBugIssue(issue.issue_type));
  }, [issueRows, issueFilter]);

  const isEmpty = showEmpty || !payload;
  const issuesEmpty = isEmpty || filteredIssues.length === 0;
  const callToActions = useMemo(
    () =>
      (effectivePayload?.call_to_actions ?? []).map((cta) => ({
        ...cta,
        category: CTA_CATEGORIES.includes(cta.category as CtaCategory)
          ? (cta.category as CtaCategory)
          : "Meeting & MoM Follow-ups",
        action_when_approved: Array.isArray(cta.action_when_approved)
          ? cta.action_when_approved
          : [String(cta.action_when_approved ?? "").trim()].filter(Boolean),
        jira_actions: Array.isArray(cta.jira_actions) ? cta.jira_actions : [],
        status: statusOverrides[cta.cta_id] ?? cta.status ?? "Pending",
      })),
    [effectivePayload, statusOverrides]
  );

  const callToActionsByCategory = useMemo(
    () =>
      CTA_CATEGORIES.map((category) => ({
        category,
        actions: callToActions.filter((cta) => cta.category === category),
      })),
    [callToActions]
  );

  const toggleCategory = (category: CtaCategory) => {
    setExpandedCategory((prev) => {
      const isClosing = prev === category;
      if (isClosing) setExpandedCtaId(null);
      return isClosing ? null : category;
    });
    setCtaError(null);
  };

  const toggleCta = (ctaId: string) => {
    setExpandedCtaId((prev) => (prev === ctaId ? null : ctaId));
    setCtaError(null);
  };

  const priorityClass = (priority: string) => {
    if (priority === "Critical") return "bg-destructive text-destructive-foreground";
    if (priority === "High") return "bg-destructive/75 text-destructive-foreground";
    if (priority === "Medium") return "bg-amber-500/80 text-white";
    return "bg-muted text-muted-foreground";
  };

  const statusLabel = (status: string) => {
    if (status === "Executed") return "Executed";
    if (status === "Approved") return "Approved";
    if (status === "Dismissed") return "Rejected";
    return "Pending";
  };

  const persistCtaStatus = async (
    ctaId: string,
    status: CallToActionEntry["status"],
    payloadOverride?: MeetingMinutesPayload
  ) => {
    if (!sessionId || !draftPayload) return;
    const base = payloadOverride ?? draftPayload;
    const updatedPayload: MeetingMinutesPayload = {
      ...base,
      call_to_actions: (base.call_to_actions ?? []).map((cta) =>
        cta.cta_id === ctaId ? { ...cta, status } : cta
      ),
    };
    const saved = await saveSession(
      sessionId,
      { payload: updatedPayload },
      { skipAtlassianSync: true }
    );
    const nextPayload = saved.payload ?? updatedPayload;
    setDraftPayload(nextPayload);
    setStatusOverrides((prev) => ({ ...prev, [ctaId]: status }));
    onPayloadUpdated?.(nextPayload);
  };

  const handleCtaDecision = async (
    ctaId: string,
    decision: "approve" | "reject"
  ) => {
    if (!draftPayload) return;
    const cta = callToActions.find((item) => item.cta_id === ctaId);
    if (!cta) return;

    setCtaSavingId(ctaId);
    setCtaError(null);

    try {
      if (decision === "reject") {
        await persistCtaStatus(ctaId, "Dismissed");
        setExpandedCtaId(null);
        return;
      }

      const jiraActions = cta.jira_actions ?? [];
      if (jiraActions.length > 0) {
        const exec = await executeCtaJiraActionsForCta(cta, draftPayload);
        if (!exec.ok) {
          setStatusOverrides((prev) => {
            const copy = { ...prev };
            delete copy[ctaId];
            return copy;
          });
          setCtaError(
            exec.errors.length
              ? exec.errors.join("; ")
              : "Jira actions failed. CTA remains pending — retry after fixing."
          );
          return;
        }
        const payloadWithJira = applyCtaJiraResultsToPayload(draftPayload, cta, exec);
        await persistCtaStatus(ctaId, "Executed", payloadWithJira);
        void reloadJiraData();
        setSaveNotice(
          `CTA executed in Jira (${exec.steps.map((s) => s.operation).join(" → ")}). Issue tracker updated.`
        );
      } else {
        await persistCtaStatus(ctaId, "Executed");
      }
      setExpandedCtaId(null);
    } catch (err) {
      setStatusOverrides((prev) => {
        const copy = { ...prev };
        delete copy[ctaId];
        return copy;
      });
      setCtaError(err instanceof Error ? err.message : "Failed to update CTA");
    } finally {
      setCtaSavingId(null);
    }
  };

  const ownerOptions = useMemo(() => {
    const owners = new Set<string>();
    const add = (v?: string) => {
      const value = (v ?? "").trim();
      if (value) owners.add(value);
    };
    for (const milestone of effectivePayload?.project_plan?.milestones ?? []) {
      add(milestone.owner);
      for (const task of milestone.tasks ?? []) add(task.owner);
    }
    for (const issue of effectivePayload?.issue_tracker ?? []) add(issue.assignee);
    for (const action of effectivePayload?.minutes_of_meeting?.action_items ?? []) add(action.owner);
    for (const risk of effectivePayload?.raid_log?.risks ?? []) add(risk.owner);
    for (const assumption of effectivePayload?.raid_log?.assumptions ?? []) add(assumption.owner);
    for (const issue of effectivePayload?.raid_log?.issues ?? []) add(issue.owner);
    for (const dependency of effectivePayload?.raid_log?.dependencies ?? []) add(dependency.owner);
    return [...owners];
  }, [effectivePayload]);

  const issueAssigneeOptions = useMemo(
    () =>
      buildAssigneeOptions({
        atlassianUsers: jiraUsers,
        fallbackOwners: ownerOptions,
        currentAssignees: issueRows.map((issue) => issue.assignee),
      }),
    [issueRows, jiraUsers, ownerOptions]
  );

  const markDirtyIssues = (
    nextIssues: MeetingMinutesPayload["issue_tracker"],
    previousIssues: MeetingMinutesPayload["issue_tracker"] = draftPayload?.issue_tracker ?? []
  ) => {
    const changed: string[] = [];
    for (const issue of nextIssues) {
      const key = issue.issue_key?.trim();
      if (!key) continue;
      const before = previousIssues.find((row) => row.issue_key === key);
      if (!before || JSON.stringify(before) !== JSON.stringify(issue)) {
        changed.push(key);
      }
    }
    if (changed.length) {
      setDirtyIssueKeys((keys) => [...new Set([...keys, ...changed])]);
    }
  };

  const handleSavePayload = async () => {
    if (!effectivePayload || !sessionId || !isDirty) return;
    setIsSavingPayload(true);
    setSaveError(null);
    setSaveNotice(null);

    const syncIssueKeys =
      dirtyIssueKeys.length > 0
        ? dirtyIssueKeys
        : activeTab === "issues"
          ? (effectivePayload.issue_tracker ?? [])
              .map((i) => i.issue_key?.trim())
              .filter((k): k is string => Boolean(k && isValidJiraIssueKey(k)))
          : undefined;

    try {
      const saved = await saveSession(
        sessionId,
        { payload: effectivePayload },
        { syncIssueKeys }
      );
      setDraftPayload(saved.payload ?? effectivePayload);
      setIsDirty(false);
      setDirtyIssueKeys([]);
      setStatusOverrides({});

      const sync = saved.atlassian_sync;
      if (sync?.errors?.length) {
        setSaveError(`Saved in app. ${sync.errors.join("; ")}`);
      } else {
        const syncMsg = formatAtlassianSyncMessage(sync);
        if (syncMsg) setSaveNotice(syncMsg);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSavingPayload(false);
    }
  };

  const saveIssueTrackerEdit = async (
    nextIssues: MeetingMinutesPayload["issue_tracker"],
    changedIssue: IssueTrackerEntry
  ) => {
    if (!effectivePayload || !sessionId) {
      throw new Error("No active session to save this ticket");
    }

    const changedKey = changedIssue.issue_key?.trim();
    const syncIssueKeys =
      changedKey && isValidJiraIssueKey(changedKey) ? [changedKey] : undefined;
    const updatedPayload: MeetingMinutesPayload = {
      ...effectivePayload,
      issue_tracker: nextIssues,
    };

    setIsSavingPayload(true);
    setSaveError(null);
    setSaveNotice(null);

    try {
      const saved = await saveSession(
        sessionId,
        { payload: updatedPayload },
        { syncIssueKeys }
      );
      setDraftPayload(saved.payload ?? updatedPayload);
      setIsDirty(false);
      setDirtyIssueKeys([]);
      setStatusOverrides({});

      const sync = saved.atlassian_sync;
      if (sync?.errors?.length) {
        const message = `Saved in app. ${sync.errors.join("; ")}`;
        setSaveError(message);
        throw new Error(message);
      }

      const syncMsg = formatAtlassianSyncMessage(sync);
      setSaveNotice(syncMsg || "Ticket changes saved.");
      await reloadJiraIssues();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save ticket changes";
      setSaveError(message);
      throw new Error(message);
    } finally {
      setIsSavingPayload(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!sessionId || !effectivePayload || !feedbackText.trim()) return;
    setIsRefining(true);
    setRefineError(null);
    try {
      const { job_id } = await postAgentJob({
        mode: "refine",
        session_id: sessionId,
        message: feedbackText.trim(),
        feedback_text: feedbackText.trim(),
        current_payload: effectivePayload,
        project_name: effectivePayload.metadata?.meeting_title?.trim() || undefined,
      });
      const result = await pollAgentJob(job_id);
      if (result.status === "failed") {
        throw new Error(
          result.stage
            ? `Feedback agent job failed at ${result.stage}: ${result.error ?? "Unknown error"}`
            : result.error ?? "Feedback agent job failed"
        );
      }
      if (!result.payload) {
        throw new Error("Feedback agent did not return an updated payload");
      }
      setDraftPayload(result.payload);
      setStatusOverrides({});
      setIsDirty(false);
      setFeedbackText("");
      setExpandedCategory(null);
      setExpandedCtaId(null);
      setCtaError(null);
      const syncMsg = formatAtlassianSyncMessage(result.atlassian_sync);
      if (syncMsg) {
        if (result.atlassian_sync?.ok) setSaveNotice(syncMsg);
        else setRefineError(`Report updated. ${syncMsg}`);
      }
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : "Failed to refine report");
    } finally {
      setIsRefining(false);
    }
  };

  const handleDownload = async () => {
    if (!effectivePayload || isDownloading) return;
    setIsDownloading(true);
    try {
      const projectTitle = effectivePayload.metadata?.meeting_title;
      if (activeTab === "plan") {
        downloadProjectPlanExcel(effectivePayload.project_plan, projectTitle);
      } else if (activeTab === "issues") {
        downloadIssueTrackerExcel(filteredIssues, projectTitle);
      } else if (activeTab === "raid") {
        downloadRaidLogExcel(effectivePayload.raid_log, projectTitle);
      } else if (activeTab === "mom") {
        await downloadMomDocx(
          effectivePayload.minutes_of_meeting,
          effectivePayload.metadata ?? null,
          projectTitle
        );
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadLabel: Record<DashboardTabId, string> = {
    plan: "Download Excel",
    issues: "Download Excel",
    raid: "Download Excel",
    mom: "Download DOCX",
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {effectivePayload ? (
        <section className="glass-card rounded-xl p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Feedback Refinement
              </p>
              <p className="mt-1 text-base font-semibold text-foreground">
                Improve this report using stakeholder feedback.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your feedback to regenerate the current version with the latest updates, action status changes, and refined recommendations.
              </p>
            </div>
            <div>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Enter feedback for the feedback agent..."
                disabled={isRefining}
                className="min-h-[92px] w-full rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  disabled={isRefining || !feedbackText.trim()}
                  onClick={() => void handleFeedbackSubmit()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-br from-primary to-[#A65A2C] px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {isRefining ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Submit feedback"
                  )}
                </button>
              </div>
            </div>
          </div>
          {refineError ? (
            <div className="mt-2 rounded-md border border-destructive/20 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
              {refineError}
            </div>
          ) : null}
        </section>
      ) : null}

      {callToActions.length > 0 ? (
        <section className="glass-card rounded-xl p-3">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Recommended actions</p>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {callToActionsByCategory.map(({ category, actions }) => {
              const expanded = expandedCategory === category;
              return (
                <Fragment key={category}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="rounded-lg border border-border/50 bg-background/70 p-3 text-left transition-colors hover:bg-black/2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{category}</p>
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {actions.length} action{actions.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{actions.length ? "Click to view actions" : "No actions in this category"}</span>
                      <span className="inline-flex items-center gap-1">
                        {expanded ? (
                          <>
                            Collapse
                            <ChevronUp className="h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            Expand
                            <ChevronDown className="h-3.5 w-3.5" />
                          </>
                        )}
                      </span>
                    </div>
                  </button>
                  {expanded ? (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 md:col-span-3">
                      {actions.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          This category currently has no recommended actions.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                          {actions.map((cta) => {
                            const ctaExpanded = expandedCtaId === cta.cta_id;
                            const completed =
                              cta.status === "Executed" || cta.status === "Dismissed";
                            return (
                              <Fragment key={cta.cta_id}>
                                <button
                                  type="button"
                                  onClick={() => toggleCta(cta.cta_id)}
                                  className="rounded-lg border border-border/50 bg-background/70 px-4 py-3 text-left transition-colors hover:bg-black/2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="line-clamp-1 text-sm font-semibold text-foreground">{cta.title}</p>
                                    <span
                                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${priorityClass(
                                        cta.priority
                                      )}`}
                                    >
                                      {cta.priority}
                                    </span>
                                  </div>
                                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span className={completed ? "text-success font-medium" : ""}>
                                      {statusLabel(cta.status)}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      {ctaExpanded ? (
                                        <>
                                          Collapse
                                          <ChevronUp className="h-3.5 w-3.5" />
                                        </>
                                      ) : (
                                        <>
                                          Expand
                                          <ChevronDown className="h-3.5 w-3.5" />
                                        </>
                                      )}
                                    </span>
                                  </div>
                                </button>
                                {ctaExpanded ? (
                                  <div className="rounded-md border border-border/40 bg-background/60 px-4 py-3 md:col-span-3">
                                    <p className="text-xs text-muted-foreground">{cta.description}</p>
                                    <p className="mt-2 text-xs font-medium text-foreground">Impact</p>
                                    <p className="text-xs text-muted-foreground">{cta.impact}</p>
                                    <p className="mt-2 text-xs font-medium text-foreground">Action when approved</p>
                                    <ul className="mt-1 space-y-1 pl-4 text-xs text-muted-foreground">
                                      {(cta.action_when_approved ?? []).map((step, index) => (
                                        <li key={`${cta.cta_id}-step-${index}`} className="list-disc">
                                          {step}
                                        </li>
                                      ))}
                                    </ul>
                                    {(cta.jira_actions?.length ?? 0) > 0 ? (
                                      <p className="mt-2 text-[11px] text-muted-foreground">
                                        {cta.jira_actions!.length} Jira operation
                                        {cta.jira_actions!.length === 1 ? "" : "s"} will run on Accept via TPM
                                        backend.
                                      </p>
                                    ) : null}
                                    <div className="mt-3 flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        disabled={ctaSavingId === cta.cta_id}
                                        onClick={() => void handleCtaDecision(cta.cta_id, "reject")}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-50"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                        Reject
                                      </button>
                                      <button
                                        type="button"
                                        disabled={ctaSavingId === cta.cta_id || completed}
                                        onClick={() => void handleCtaDecision(cta.cta_id, "approve")}
                                        className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-br from-primary to-[#A65A2C] px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                                      >
                                        {ctaSavingId === cta.cta_id ? (
                                          <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Processing...
                                          </>
                                        ) : (
                                          <>
                                            <Check className="h-3.5 w-3.5" />
                                            Accept
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                ) : null}
                              </Fragment>
                            );
                          })}
                        </div>
                      )}
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedCategory(null);
                            setExpandedCtaId(null);
                          }}
                          className="inline-flex items-center rounded-md border border-border/50 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50"
                        >
                          Close category
                        </button>
                      </div>
                    </div>
                  ) : null}
                </Fragment>
              );
            })}
          </div>
          {ctaError ? (
            <div className="mt-2 rounded-md border border-destructive/20 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
              {ctaError}
            </div>
          ) : null}
        </section>
      ) : null}

      <ProjectAnalyticsSection payload={payload} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={DASHBOARD_TABS}
          active={activeTab}
          onChange={(key) => setActiveTab(key as DashboardTabId)}
        />
        <div className="flex items-center gap-2">
          {effectivePayload ? (
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => void handleDownload()}
              className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {downloadLabel[activeTab]}
            </button>
          ) : null}
          {sessionId ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditingAll((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50"
              >
                <Pencil className="h-3.5 w-3.5" />
                {isEditingAll ? "Done" : "Edit"}
              </button>
              <button
                type="button"
                disabled={!isDirty || isSavingPayload}
                onClick={() => void handleSavePayload()}
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-br from-primary to-[#A65A2C] px-2.5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                {isSavingPayload ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {dirtyIssueKeys.length || activeTab === "issues" ? "Syncing to Jira..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    {dirtyIssueKeys.length || activeTab === "issues"
                      ? "Save & sync to Jira"
                      : "Save changes"}
                  </>
                )}
              </button>
            </>
          ) : null}
        </div>
      </div>
      {saveNotice ? (
        <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-foreground">
          {saveNotice}
        </div>
      ) : null}
      {saveError ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {saveError}
        </div>
      ) : null}
      {activeTab === "issues" && jiraIssueError ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Jira issues could not be loaded, showing generated issue tracker rows. {jiraIssueError}
        </div>
      ) : null}
      {activeTab === "issues" && jiraUserError ? (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
          Atlassian assignees could not be loaded, showing report owners instead. {jiraUserError}
        </div>
      ) : null}

      <article className="glass-card relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {isLoading ? <LoadingOverlay /> : null}

          {activeTab === "plan" ? (
            <ProjectPlanTable
              embedded
              plan={draftPayload?.project_plan ?? null}
              projectTitle={draftPayload?.metadata?.meeting_title}
              isLoading={isLoading}
              isEmpty={isEmpty}
              editable={isEditingAll}
              ownerOptions={ownerOptions}
              onChange={(next) => {
                setDraftPayload((prev) => (prev ? { ...prev, project_plan: next } : prev));
                setIsDirty(true);
              }}
            />
          ) : null}

          {activeTab === "issues" ? (
            <IssueTracker
              embedded
              issues={filteredIssues}
              isLoading={isLoading || isLoadingJiraIssues || isLoadingJiraUsers}
              isEmpty={issuesEmpty && !jiraIssues.length}
              editable={isEditingAll}
              ownerOptions={issueAssigneeOptions}
              onChange={(next) => {
                markDirtyIssues(next, filteredIssues);
                setDraftPayload((prev) => (prev ? { ...prev, issue_tracker: next } : prev));
                setIsDirty(true);
              }}
              onApplyEdit={saveIssueTrackerEdit}
            />
          ) : null}

          {activeTab === "raid" ? (
            <RaidLogPanel
              embedded
              raid={draftPayload?.raid_log ?? null}
              isLoading={isLoading}
              isEmpty={isEmpty}
              editable={isEditingAll}
              ownerOptions={ownerOptions}
              onChange={(next) => {
                setDraftPayload((prev) => (prev ? { ...prev, raid_log: next } : prev));
                setIsDirty(true);
              }}
            />
          ) : null}

          {activeTab === "mom" ? (
            <MeetingMinutes
              embedded
              minutes={draftPayload?.minutes_of_meeting ?? null}
              metadata={draftPayload?.metadata ?? null}
              isLoading={isLoading}
              isEmpty={isEmpty}
              editable={isEditingAll}
              ownerOptions={ownerOptions}
              onChange={(nextMinutes, nextMetadata) => {
                setDraftPayload((prev) =>
                  prev
                    ? {
                        ...prev,
                        minutes_of_meeting: nextMinutes,
                        metadata: nextMetadata ?? prev.metadata,
                      }
                    : prev
                );
                setIsDirty(true);
              }}
            />
          ) : null}
        </div>
      </article>
    </div>
  );
}
