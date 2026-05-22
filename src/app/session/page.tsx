"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Clock3, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { postAgentJob, pollAgentJob } from "@/lib/agentClient";
import { AGENT_ID } from "@/lib/constants";
import { clearStoredSessionId, generateSessionId, getStoredSessionId, setStoredSessionId } from "@/lib/session";
import { fetchSession, fetchSessionList, removeSession, type SessionListItem } from "@/lib/sessionStore";
import { SAMPLE_TRANSCRIPT } from "@/lib/sampleTranscript";
import type { MeetingMinutesPayload } from "@/types/meetingPayload";

const VERSION_LOADING_STEPS = [
  "Validating transcript and meeting context",
  "Extracting action points and delivery risks",
  "Building project plan, issues, and RAID sections",
  "Composing minutes and preparing dashboard blocks",
  "Finalizing the new version data package",
];

type ProjectGroup = {
  key: string;
  title: string;
  sessions: SessionListItem[];
};

type VersionGenerationState = {
  projectTitle: string;
  upcomingVersionLabel: string;
};

type DeleteTarget = {
  kind: "version" | "project";
  title: string;
  sessionIds: string[];
  projectKey?: string;
};

const NEW_PROJECT_SAMPLE_TITLE = "HS H3M Data One";

function normalizeProjectKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function sanitizeProjectName(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.toLowerCase() === "untitled project") return undefined;
  return trimmed;
}

function formatWhen(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function groupSessionsByProject(sessions: SessionListItem[]): ProjectGroup[] {
  const groups = new Map<string, ProjectGroup>();
  for (const session of sessions) {
    const title =
      session.projectName?.trim() ||
      session.title?.trim() ||
      `Project ${session.sessionId.slice(0, 8)}`;
    const key = normalizeProjectKey(title) || `session:${session.sessionId}`;
    const group = groups.get(key);
    if (group) group.sessions.push(session);
    else groups.set(key, { key, title, sessions: [session] });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      sessions: [...group.sessions].sort((a, b) => {
        const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
        const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
        return bTime - aTime;
      }),
    }))
    .sort((a, b) => {
      const aTime = new Date(a.sessions[0]?.updatedAt ?? a.sessions[0]?.createdAt ?? 0).getTime();
      const bTime = new Date(b.sessions[0]?.updatedAt ?? b.sessions[0]?.createdAt ?? 0).getTime();
      return bTime - aTime;
    });
}

function SessionViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [payload, setPayload] = useState<MeetingMinutesPayload | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [deletingSessionIds, setDeletingSessionIds] = useState<string[]>([]);
  const [deletingProjectKey, setDeletingProjectKey] = useState<string | null>(null);
  const [isDeleteInProgress, setIsDeleteInProgress] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [newVersionOpen, setNewVersionOpen] = useState(false);
  const [newVersionTranscript, setNewVersionTranscript] = useState("");
  const [newVersionLoading, setNewVersionLoading] = useState(false);
  const [newVersionError, setNewVersionError] = useState<string | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectTranscript, setNewProjectTranscript] = useState("");
  const [newProjectLoading, setNewProjectLoading] = useState(false);
  const [newProjectError, setNewProjectError] = useState<string | null>(null);
  const [versionGenerating, setVersionGenerating] = useState<VersionGenerationState | null>(null);
  const [versionStepIndex, setVersionStepIndex] = useState(0);
  const loadingIdRef = useRef<string | null>(null);
  const lastLoadedRef = useRef<string | null>(null);

  const selectedProjectFromUrl = searchParams.get("project")?.trim() ?? "";
  const selectedSessionFromUrl = searchParams.get("id")?.trim() ?? "";
  const bugsFocus = searchParams.get("focus") === "bugs";

  const projectGroups = useMemo(() => groupSessionsByProject(sessions), [sessions]);

  const selectedProjectKey = useMemo(() => {
    if (selectedProjectFromUrl && projectGroups.some((group) => group.key === selectedProjectFromUrl)) {
      return selectedProjectFromUrl;
    }
    if (!selectedSessionFromUrl) return "";
    const group = projectGroups.find((item) =>
      item.sessions.some((session) => session.sessionId === selectedSessionFromUrl)
    );
    return group?.key ?? "";
  }, [selectedProjectFromUrl, selectedSessionFromUrl, projectGroups]);

  const selectedProject = useMemo(
    () => projectGroups.find((group) => group.key === selectedProjectKey) ?? null,
    [projectGroups, selectedProjectKey]
  );

  const refreshList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      setSessions(await fetchSessionList());
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadSession = useCallback(async (id: string, options?: { force?: boolean }) => {
    const trimmed = id.trim();
    if (!trimmed) return;
    if (!options?.force && trimmed === lastLoadedRef.current) return;

    loadingIdRef.current = trimmed;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await fetchSession(trimmed);
      if (loadingIdRef.current !== trimmed) return;
      if (!data) {
        setDetailError("Session data could not be loaded.");
        setHasLoaded(false);
        lastLoadedRef.current = null;
        return;
      }
      setSelectedSessionId(trimmed);
      setPayload(data.payload ?? null);
      setTranscript(data.transcript ?? null);
      setHasLoaded(true);
      lastLoadedRef.current = trimmed;
    } catch (err) {
      if (loadingIdRef.current !== trimmed) return;
      setDetailError(err instanceof Error ? err.message : "Failed to load session");
      setHasLoaded(false);
      lastLoadedRef.current = null;
    } finally {
      if (loadingIdRef.current === trimmed) setDetailLoading(false);
    }
  }, []);

  const resetViewer = useCallback(() => {
    loadingIdRef.current = null;
    lastLoadedRef.current = null;
    setSelectedSessionId(null);
    setPayload(null);
    setTranscript(null);
    setHasLoaded(false);
    setDetailError(null);
    setDetailLoading(false);
  }, []);

  const goToIteration = useCallback((projectKey: string, sessionId: string) => {
    const params = new URLSearchParams();
    params.set("project", projectKey);
    params.set("id", sessionId);
    if (bugsFocus) params.set("focus", "bugs");
    router.replace(`/session?${params.toString()}`, { scroll: false });
  }, [bugsFocus, router]);

  const openProject = useCallback((group: ProjectGroup) => {
    if (!group.sessions.length) return;
    goToIteration(group.key, group.sessions[0].sessionId);
  }, [goToIteration]);

  const requestDeleteVersion = useCallback((sessionId: string, title: string) => {
    const trimmed = sessionId.trim();
    if (!trimmed || isDeleteInProgress) return;
    setDeleteError(null);
    setDeleteTarget({
      kind: "version",
      title: title || "this version",
      sessionIds: [trimmed],
    });
  }, [isDeleteInProgress]);

  const requestDeleteProject = useCallback((group: ProjectGroup) => {
    const ids = group.sessions.map((session) => session.sessionId.trim()).filter(Boolean);
    if (!ids.length || isDeleteInProgress) return;
    setDeleteError(null);
    setDeleteTarget({
      kind: "project",
      title: group.title,
      sessionIds: ids,
      projectKey: group.key,
    });
  }, [isDeleteInProgress]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget || isDeleteInProgress) return;
    const uniqueIds = [...new Set(deleteTarget.sessionIds.map((id) => id.trim()).filter(Boolean))];
    if (!uniqueIds.length) {
      setDeleteTarget(null);
      return;
    }

    const targetSnapshot = deleteTarget;
    setIsDeleteInProgress(true);
    setDeleteError(null);
    setDeletingSessionIds(uniqueIds);
    if (targetSnapshot.kind === "project" && targetSnapshot.projectKey) {
      setDeletingProjectKey(targetSnapshot.projectKey);
      setDeleteTarget(null);
    }
    setListError(null);

    try {
      for (const id of uniqueIds) {
        await removeSession(id);
      }
      setSessions((prev) => prev.filter((session) => !uniqueIds.includes(session.sessionId)));
      const storedId = getStoredSessionId();
      if (storedId && uniqueIds.includes(storedId)) clearStoredSessionId();

      const deletedActiveSession =
        (selectedSessionFromUrl && uniqueIds.includes(selectedSessionFromUrl)) ||
        (selectedSessionId && uniqueIds.includes(selectedSessionId));
      const deletedWholeProject =
        targetSnapshot.kind === "project" &&
        targetSnapshot.projectKey &&
        selectedProjectKey === targetSnapshot.projectKey;

      if (deletedActiveSession || deletedWholeProject) {
        resetViewer();
        router.replace("/session", { scroll: false });
      }

      setDeleteTarget(null);
      await refreshList();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : targetSnapshot.kind === "project"
            ? "Failed to delete project"
            : "Failed to delete version";
      if (targetSnapshot.kind === "project") {
        setDeleteTarget(targetSnapshot);
      }
      setDeleteError(message);
      setListError(message);
    } finally {
      setIsDeleteInProgress(false);
      setDeletingProjectKey(null);
      setDeletingSessionIds([]);
    }
  }, [
    deleteTarget,
    isDeleteInProgress,
    selectedSessionFromUrl,
    selectedSessionId,
    selectedProjectKey,
    resetViewer,
    router,
    refreshList,
  ]);

  const handleCreateVersion = useCallback(async () => {
    const trimmed = newVersionTranscript.trim();
    if (!trimmed || !selectedProject) return;

    const projectName = sanitizeProjectName(selectedProject.title) ?? sanitizeProjectName(payload?.metadata?.meeting_title);
    const newSessionId = generateSessionId(AGENT_ID);
    const nextVersionLabel = `v${selectedProject.sessions.length + 1}`;
    setNewVersionLoading(true);
    setNewVersionError(null);
    setVersionStepIndex(0);
    setVersionGenerating({
      projectTitle: selectedProject.title,
      upcomingVersionLabel: nextVersionLabel,
    });
    setHistoryOpen(false);
    setNewVersionOpen(false);

    try {
      const { job_id } = await postAgentJob({
        message: trimmed,
        session_id: newSessionId,
        mode: "analyze",
        transcript: trimmed,
        project_name: projectName,
      });
      const result = await pollAgentJob(job_id);
      if (result.status === "failed") {
        throw new Error(result.error ?? "Agent job failed");
      }
      const sessionId = result.session_id ?? newSessionId;
      setStoredSessionId(sessionId);
      await refreshList();
      setNewVersionTranscript("");
      goToIteration(selectedProject.key, sessionId);
    } catch (err) {
      setNewVersionError(err instanceof Error ? err.message : "Failed to create new version");
      setNewVersionOpen(true);
    } finally {
      setVersionGenerating(null);
      setNewVersionLoading(false);
    }
  }, [newVersionTranscript, selectedProject, payload, refreshList, goToIteration]);

  const handleCreateProject = useCallback(async () => {
    const title = sanitizeProjectName(newProjectTitle);
    const transcriptInput = newProjectTranscript.trim();
    if (!title || !transcriptInput) return;

    const newSessionId = generateSessionId(AGENT_ID);
    setNewProjectLoading(true);
    setNewProjectError(null);
    setVersionStepIndex(0);
    setVersionGenerating({
      projectTitle: title,
      upcomingVersionLabel: "v1",
    });
    setNewProjectOpen(false);

    try {
      const { job_id } = await postAgentJob({
        message: transcriptInput,
        session_id: newSessionId,
        mode: "analyze",
        transcript: transcriptInput,
        project_name: title,
      });
      const result = await pollAgentJob(job_id);
      if (result.status === "failed") {
        throw new Error(result.error ?? "Agent job failed");
      }
      const sessionId = result.session_id ?? newSessionId;
      setStoredSessionId(sessionId);
      await refreshList();
      setNewProjectTitle("");
      setNewProjectTranscript("");
      goToIteration(normalizeProjectKey(title), sessionId);
    } catch (err) {
      setNewProjectError(err instanceof Error ? err.message : "Failed to create project");
      setNewProjectOpen(true);
    } finally {
      setVersionGenerating(null);
      setNewProjectLoading(false);
    }
  }, [newProjectTitle, newProjectTranscript, refreshList, goToIteration]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (!selectedSessionFromUrl || listLoading) return;
    void loadSession(selectedSessionFromUrl);
  }, [selectedSessionFromUrl, listLoading, loadSession]);

  useEffect(() => {
    if (!selectedProject || selectedSessionFromUrl) return;
    const latest = selectedProject.sessions[0];
    if (!latest) return;
    goToIteration(selectedProject.key, latest.sessionId);
  }, [selectedProject, selectedSessionFromUrl, goToIteration]);

  useEffect(() => {
    if (!bugsFocus || listLoading || selectedSessionFromUrl) return;
    const firstWithIssues = sessions.find((session) => session.issuesCount > 0);
    if (!firstWithIssues) return;
    const key = normalizeProjectKey(firstWithIssues.projectName || firstWithIssues.title || "");
    goToIteration(key, firstWithIssues.sessionId);
  }, [bugsFocus, listLoading, selectedSessionFromUrl, sessions, goToIteration]);

  useEffect(() => {
    if (!versionGenerating) return;
    const timer = window.setInterval(() => {
      setVersionStepIndex((prev) =>
        prev < VERSION_LOADING_STEPS.length - 1 ? prev + 1 : prev
      );
    }, 25000);
    return () => window.clearInterval(timer);
  }, [versionGenerating]);

  return (
    <div className="flex flex-1 overflow-hidden app-bg">
      <main className="flex-1 overflow-auto">
        <div className="mx-auto flex h-full max-w-[1280px] flex-col px-4 py-5 sm:px-6">
          {listError ? (
            <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {listError}
            </div>
          ) : null}

          {listLoading && sessions.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
              Loading project overview...
            </div>
          ) : null}

          {versionGenerating ? (
            <section className="flex min-h-0 flex-1 flex-col">
              <div className="glass-card flex min-h-0 flex-1 flex-col rounded-xl p-6">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {versionGenerating.upcomingVersionLabel} will be ready soon
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                  {versionGenerating.projectTitle}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  TPM Agent is preparing this version. Estimated processing time is 2-3 minutes.
                </p>

                <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{
                      width: `${Math.max(
                        16,
                        ((versionStepIndex + 1) / VERSION_LOADING_STEPS.length) * 100
                      )}%`,
                    }}
                  />
                </div>

                <div className="mt-5 space-y-3">
                  {VERSION_LOADING_STEPS.map((step, index) => {
                    const active = index === versionStepIndex;
                    const done = index < versionStepIndex;
                    return (
                      <div
                        key={step}
                        className="flex items-center gap-3 rounded-lg border border-border/50 bg-black/3 px-3 py-2"
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            done ? "bg-primary" : active ? "bg-primary/70 animate-pulse" : "bg-muted-foreground/30"
                          }`}
                        />
                        <span
                          className={`text-sm ${
                            done || active ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="h-28 animate-pulse rounded-lg border border-border/50 bg-black/3" />
                  <div className="h-28 animate-pulse rounded-lg border border-border/50 bg-black/3" />
                  <div className="h-36 animate-pulse rounded-lg border border-border/50 bg-black/3 md:col-span-2" />
                </div>
              </div>
            </section>
          ) : null}

          {!versionGenerating && !listLoading && !selectedProject ? (
            <section className="flex flex-1 flex-col">
              <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">Project overview</h2>
                  <p className="text-sm text-muted-foreground">
                    Select a project to view iterations and switch versions.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void refreshList()}
                    className="rounded-xl border border-border/50 bg-black/4 px-3 py-2 text-sm font-medium text-foreground hover:bg-black/[0.07]"
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewProjectError(null);
                      setNewProjectTitle("");
                      setNewProjectTranscript("");
                      setNewProjectOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-primary to-[#A65A2C] px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" />
                    Add new project
                  </button>
                </div>
              </header>

              {projectGroups.length === 0 ? (
                <div className="glass-card flex flex-1 items-center justify-center rounded-xl p-8 text-sm text-muted-foreground">
                  No projects yet. Use Add new project to create one.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {projectGroups.map((group) => {
                    const latest = group.sessions[0];
                    const issueCount = group.sessions.reduce((sum, item) => sum + item.issuesCount, 0);
                    const raidCount = group.sessions.reduce((sum, item) => sum + item.raidCount, 0);
                    const isDeletingThisProject = deletingProjectKey === group.key;
                    const isConfirmingThisProject =
                      deleteTarget?.kind === "project" && deleteTarget.projectKey === group.key;
                    return (
                      <div
                        key={group.key}
                        className="group relative rounded-xl border border-border/50 bg-card/80 p-4 transition-colors hover:bg-black/2"
                      >
                        <button
                          type="button"
                          disabled={isDeletingThisProject}
                          onClick={() => openProject(group)}
                          className="w-full text-left disabled:opacity-60"
                        >
                          <p className="line-clamp-2 pr-8 text-sm font-semibold text-foreground">{group.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Latest: {formatWhen(latest.updatedAt)}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                            <span className="rounded bg-primary/10 px-2 py-1 font-medium text-primary">
                              Iterations {group.sessions.length}
                            </span>
                            <span className="rounded bg-black/4 px-2 py-1 font-medium text-foreground">
                              Issues {issueCount}
                            </span>
                            <span className="rounded bg-black/4 px-2 py-1 font-medium text-foreground">
                              RAID {raidCount}
                            </span>
                          </div>
                        </button>
                        <button
                          type="button"
                          disabled={isDeletingThisProject || isDeleteInProgress}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            requestDeleteProject(group);
                          }}
                          aria-label={`Delete project ${group.title}`}
                          className={`absolute right-2 top-2 z-10 rounded-md border border-border/50 bg-card p-1.5 text-muted-foreground transition-opacity hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 ${
                            isConfirmingThisProject ? "opacity-100" : "opacity-70 group-hover:opacity-100"
                          }`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        {isDeletingThisProject ? (
                          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-xl bg-card/85 backdrop-blur-[1px]">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <p className="text-xs font-medium text-foreground">Deleting project...</p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          {!versionGenerating && selectedProject ? (
            <section className="relative flex min-h-0 flex-1 flex-col">
              <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      resetViewer();
                      router.replace("/session", { scroll: false });
                    }}
                    className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to project overview
                  </button>
                  <h2 className="truncate text-xl font-bold tracking-tight text-foreground">{selectedProject.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {bugsFocus
                      ? "Bug view enabled for this project."
                      : `${selectedProject.sessions.length} iteration${selectedProject.sessions.length === 1 ? "" : "s"} available.`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {detailLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : null}
                  <select
                    value={selectedSessionFromUrl}
                    onChange={(event) => goToIteration(selectedProject.key, event.target.value)}
                    disabled={Boolean(versionGenerating)}
                    className="rounded-xl border border-border/50 bg-card px-3 py-2 text-sm text-foreground"
                  >
                    {selectedProject.sessions.map((session, index) => (
                      <option key={session.sessionId} value={session.sessionId}>
                        v{selectedProject.sessions.length - index} - {formatWhen(session.updatedAt)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={Boolean(versionGenerating)}
                    onClick={() => setHistoryOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-black/4 px-3 py-2 text-sm font-medium text-foreground hover:bg-black/[0.07] disabled:opacity-50"
                  >
                    <Clock3 className="h-4 w-4" />
                    History
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(versionGenerating)}
                    onClick={() => {
                      setNewVersionError(null);
                      setNewVersionTranscript("");
                      setNewVersionOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-primary to-[#A65A2C] px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    New version
                  </button>
                </div>
              </header>

              {detailError ? (
                <div className="mb-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {detailError}
                </div>
              ) : null}

              <div className="flex min-h-0 flex-1 flex-col">
                <DashboardTabs
                  key={`${selectedSessionId ?? "none"}-${bugsFocus ? "bugs" : "all"}`}
                  payload={payload}
                  sessionId={selectedSessionId}
                  isLoading={detailLoading}
                  hasRun={hasLoaded}
                  showEmpty={!hasLoaded && !detailLoading}
                  initialTab={bugsFocus ? "issues" : undefined}
                  issueFilter={bugsFocus ? "bug" : "all"}
                  onPayloadUpdated={setPayload}
                />
              </div>

              {transcript && hasLoaded ? (
                <details className="mt-4 shrink-0 rounded-xl glass-card">
                  <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground">
                    View stored transcript
                  </summary>
                  <pre className="max-h-48 overflow-auto border-t border-black/5 p-4 text-xs whitespace-pre-wrap text-muted-foreground">
                    {transcript}
                  </pre>
                </details>
              ) : null}

              {historyOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="Close history"
                    className="fixed inset-0 z-30 bg-black/20"
                    onClick={() => setHistoryOpen(false)}
                  />
                  <aside className="fixed inset-y-0 right-0 z-40 flex w-[min(420px,92vw)] flex-col border-l border-border/50 bg-card shadow-xl">
                    <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Version history</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedProject.sessions.length} version{selectedProject.sessions.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHistoryOpen(false)}
                        className="rounded-md p-1 text-muted-foreground hover:bg-black/5 hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto p-3">
                      <div className="space-y-2">
                        {selectedProject.sessions.map((session, index) => {
                          const isActive = session.sessionId === selectedSessionId;
                          const versionLabel = `v${selectedProject.sessions.length - index}`;
                          return (
                            <div
                              key={session.sessionId}
                              className="flex items-center gap-2 rounded-lg border border-border/50 bg-black/3 p-2"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  goToIteration(selectedProject.key, session.sessionId);
                                  setHistoryOpen(false);
                                }}
                                className={`flex-1 text-left ${
                                  isActive ? "text-primary" : "text-foreground"
                                }`}
                              >
                                <p className="text-xs font-semibold">{versionLabel}</p>
                                <p className="text-[11px] text-muted-foreground">{formatWhen(session.updatedAt)}</p>
                              </button>
                              <button
                                type="button"
                                disabled={
                                  isDeleteInProgress && deletingSessionIds.includes(session.sessionId)
                                }
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  requestDeleteVersion(session.sessionId, session.title);
                                }}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                              >
                                {deletingSessionIds.includes(session.sessionId) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </aside>
                </>
              ) : null}

              {newVersionOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="Close new version modal"
                    className="fixed inset-0 z-40 bg-black/30"
                    onClick={() => {
                      if (newVersionLoading) return;
                      setNewVersionOpen(false);
                    }}
                  />
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl rounded-xl border border-border/50 bg-card shadow-xl">
                      <div className="flex items-start justify-between border-b border-border/50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Create new version</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedProject.title}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={newVersionLoading}
                          onClick={() => setNewVersionOpen(false)}
                          className="rounded-md p-1 text-muted-foreground hover:bg-black/5 hover:text-foreground disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-3 p-4">
                        <label
                          htmlFor="newVersionTranscript"
                          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                        >
                          Transcript input
                        </label>
                        <textarea
                          id="newVersionTranscript"
                          value={newVersionTranscript}
                          onChange={(event) => setNewVersionTranscript(event.target.value)}
                          disabled={newVersionLoading}
                          placeholder="Paste transcript for the next version..."
                          className="min-h-[220px] w-full resize-y rounded-lg border border-border/50 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                        />
                        {newVersionError ? (
                          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                            {newVersionError}
                          </div>
                        ) : null}
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={newVersionLoading}
                            onClick={() => setNewVersionOpen(false)}
                            className="rounded-lg border border-border/50 bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={newVersionLoading || !newVersionTranscript.trim()}
                            onClick={() => void handleCreateVersion()}
                            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-primary to-[#A65A2C] px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                          >
                            {newVersionLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Running analysis...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4" />
                                Run new version
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </section>
          ) : null}

          {deleteTarget ? (
            <>
              <button
                type="button"
                aria-label="Close delete confirmation"
                className="fixed inset-0 z-[60] bg-black/30"
                onClick={() => {
                  if (isDeleteInProgress) return;
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
              />
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="delete-dialog-title"
                  className="w-full max-w-md rounded-xl border border-border/50 bg-card shadow-xl"
                >
                  <div className="border-b border-border/50 px-4 py-3">
                    <p id="delete-dialog-title" className="text-sm font-semibold text-foreground">
                      {deleteTarget.kind === "project" ? "Delete project" : "Delete version"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {deleteTarget.kind === "project"
                        ? "This removes the project and all its versions permanently."
                        : "This removes this version permanently."}
                    </p>
                  </div>
                  <div className="space-y-3 px-4 py-4">
                    <div className="rounded-lg border border-border/50 bg-black/3 px-3 py-2 text-sm text-foreground">
                      {deleteTarget.title}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {deleteTarget.kind === "project"
                        ? `Versions to delete: ${deleteTarget.sessionIds.length}`
                        : "This action cannot be undone."}
                    </p>
                    {deleteError ? (
                      <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {deleteError}
                      </div>
                    ) : null}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={isDeleteInProgress}
                        onClick={() => {
                          setDeleteTarget(null);
                          setDeleteError(null);
                        }}
                        className="rounded-lg border border-border/50 bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isDeleteInProgress}
                        onClick={() => void handleDeleteConfirm()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        {isDeleteInProgress ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          "Delete"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {newProjectOpen ? (
            <>
              <button
                type="button"
                aria-label="Close new project modal"
                className="fixed inset-0 z-40 bg-black/30"
                onClick={() => {
                  if (newProjectLoading) return;
                  setNewProjectOpen(false);
                }}
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl rounded-xl border border-border/50 bg-card shadow-xl">
                  <div className="flex items-start justify-between border-b border-border/50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Create new project</p>
                      <p className="text-xs text-muted-foreground">
                        Enter project title and transcript input.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={newProjectLoading}
                      onClick={() => setNewProjectOpen(false)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-black/5 hover:text-foreground disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3 p-4">
                    <label
                      htmlFor="newProjectTitle"
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      Project title
                    </label>
                    <input
                      id="newProjectTitle"
                      value={newProjectTitle}
                      onChange={(event) => setNewProjectTitle(event.target.value)}
                      disabled={newProjectLoading}
                      placeholder="Enter project title..."
                      className="h-10 w-full rounded-lg border border-border/50 bg-background/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="newProjectTranscript"
                        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        Transcript input
                      </label>
                      <button
                        type="button"
                        disabled={newProjectLoading}
                        onClick={() => {
                          setNewProjectTitle(NEW_PROJECT_SAMPLE_TITLE);
                          setNewProjectTranscript(SAMPLE_TRANSCRIPT);
                        }}
                        className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                      >
                        Load dummy input
                      </button>
                    </div>
                    <textarea
                      id="newProjectTranscript"
                      value={newProjectTranscript}
                      onChange={(event) => setNewProjectTranscript(event.target.value)}
                      disabled={newProjectLoading}
                      placeholder="Paste transcript for the new project..."
                      className="min-h-[220px] w-full resize-y rounded-lg border border-border/50 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    />
                    {newProjectError ? (
                      <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {newProjectError}
                      </div>
                    ) : null}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={newProjectLoading}
                        onClick={() => setNewProjectOpen(false)}
                        className="rounded-lg border border-border/50 bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={newProjectLoading || !newProjectTranscript.trim() || !sanitizeProjectName(newProjectTitle)}
                        onClick={() => void handleCreateProject()}
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-primary to-[#A65A2C] px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        {newProjectLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Running analysis...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Create project
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default function SessionViewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading project overview...
        </div>
      }
    >
      <SessionViewContent />
    </Suspense>
  );
}
