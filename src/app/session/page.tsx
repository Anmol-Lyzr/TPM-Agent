"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2, Trash2 } from "lucide-react";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { SessionListPanel } from "@/components/session/SessionListPanel";
import {
  clearStoredSessionId,
  getStoredSessionId,
} from "@/lib/session";
import {
  fetchSession,
  fetchSessionList,
  removeSession,
  saveSession,
  type SessionListItem,
} from "@/lib/sessionStore";
import type { MeetingMinutesPayload } from "@/types/meetingPayload";

function SessionViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [loadedSessionId, setLoadedSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [payload, setPayload] = useState<MeetingMinutesPayload | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const loadingIdRef = useRef<string | null>(null);
  const lastLoadedRef = useRef<string | null>(null);
  const pendingEditRef = useRef<string | null>(null);

  const isEditing =
    Boolean(editingSessionId) &&
    editingSessionId === loadedSessionId &&
    hasLoaded;

  const refreshList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const list = await fetchSessionList();
      setSessions(list);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const loadSession = useCallback(async (id: string, options?: { force?: boolean }) => {
    const trimmed = id.trim();
    if (!trimmed) return;
    if (!options?.force && trimmed === lastLoadedRef.current) return;

    loadingIdRef.current = trimmed;
    setDetailLoading(true);
    setDetailError(null);
    setSaveError(null);

    try {
      const data = await fetchSession(trimmed);
      if (loadingIdRef.current !== trimmed) return;

      if (!data) {
        setDetailError("Session data could not be loaded.");
        setHasLoaded(false);
        lastLoadedRef.current = null;
        return;
      }

      setLoadedSessionId(trimmed);
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
      if (loadingIdRef.current === trimmed) {
        setDetailLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const fromUrl = searchParams.get("id")?.trim();
    if (!fromUrl || listLoading) return;
    void loadSession(fromUrl);
  }, [searchParams, listLoading, loadSession]);

  useEffect(() => {
    const pending = pendingEditRef.current;
    if (!pending || !hasLoaded || loadedSessionId !== pending) return;
    setEditingSessionId(pending);
    pendingEditRef.current = null;
  }, [hasLoaded, loadedSessionId]);

  const handleSelect = useCallback(
    (sessionId: string) => {
      const trimmed = sessionId.trim();
      if (!trimmed) return;
      setEditingSessionId(null);
      pendingEditRef.current = null;
      if (trimmed === searchParams.get("id")?.trim() && hasLoaded) return;
      router.replace(`/session?id=${encodeURIComponent(trimmed)}`, { scroll: false });
    },
    [router, searchParams, hasLoaded]
  );

  const clearViewer = useCallback(() => {
    loadingIdRef.current = null;
    lastLoadedRef.current = null;
    pendingEditRef.current = null;
    setEditingSessionId(null);
    setLoadedSessionId(null);
    setPayload(null);
    setTranscript(null);
    setHasLoaded(false);
    setDetailError(null);
    setSaveError(null);
    setDetailLoading(false);
  }, []);

  const handleEdit = useCallback(
    (sessionId: string) => {
      const trimmed = sessionId.trim();
      if (!trimmed || deletingSessionId) return;

      if (editingSessionId === trimmed) {
        setEditingSessionId(null);
        return;
      }

      pendingEditRef.current = trimmed;
      setEditingSessionId(trimmed);

      const urlId = searchParams.get("id")?.trim();
      if (urlId !== trimmed) {
        router.replace(`/session?id=${encodeURIComponent(trimmed)}`, { scroll: false });
        return;
      }

      if (!hasLoaded || loadedSessionId !== trimmed) {
        lastLoadedRef.current = null;
        void loadSession(trimmed, { force: true });
      }
    },
    [deletingSessionId, editingSessionId, hasLoaded, loadedSessionId, loadSession, router, searchParams]
  );

  const handleDelete = useCallback(
    async (sessionId: string, title: string) => {
      const trimmed = sessionId.trim();
      if (!trimmed || deletingSessionId) return;

      const confirmed = window.confirm(
        `Delete this session permanently?\n\n${title}\n\nThis cannot be undone.`
      );
      if (!confirmed) return;

      setDeletingSessionId(trimmed);
      setListError(null);

      try {
        await removeSession(trimmed);
        setSessions((prev) => prev.filter((s) => s.sessionId !== trimmed));

        if (getStoredSessionId() === trimmed) {
          clearStoredSessionId();
        }

        if (editingSessionId === trimmed) {
          setEditingSessionId(null);
        }

        const urlId = searchParams.get("id")?.trim();
        if (urlId === trimmed || loadedSessionId === trimmed) {
          clearViewer();
          router.replace("/session", { scroll: false });
        }
      } catch (err) {
        setListError(err instanceof Error ? err.message : "Failed to delete session");
      } finally {
        setDeletingSessionId(null);
      }
    },
    [deletingSessionId, editingSessionId, searchParams, loadedSessionId, clearViewer, router]
  );

  const handleSaveSession = useCallback(async () => {
    if (!loadedSessionId || editingSessionId !== loadedSessionId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveSession(loadedSessionId, {
        payload,
        transcript: transcript ?? undefined,
      });
      const title = payload?.metadata?.meeting_title?.trim();
      setSessions((prev) =>
        prev.map((s) =>
          s.sessionId === loadedSessionId
            ? {
                ...s,
                title: title || s.title,
                updatedAt: new Date().toISOString(),
              }
            : s
        )
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save to MongoDB");
    } finally {
      setSaving(false);
    }
  }, [loadedSessionId, editingSessionId, payload, transcript]);

  return (
    <div className="flex flex-1 overflow-hidden app-bg">
      <aside className="w-[380px] flex-shrink-0 border-r border-border/50 flex flex-col bg-card/30 overflow-hidden">
        <SessionListPanel
          sessions={sessions}
          listLoading={listLoading}
          listError={listError}
          selectedSessionId={loadedSessionId}
          editingSessionId={editingSessionId}
          detailLoading={detailLoading}
          onSelect={handleSelect}
          onRefresh={() => void refreshList()}
          onEdit={(id) => handleEdit(id)}
          onDelete={(id, title) => void handleDelete(id, title)}
          deletingSessionId={deletingSessionId}
        />
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        <div className="p-4 md:p-6 flex flex-col flex-1">
          <header className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Projects
              </h2>
              <p className="text-sm text-muted-foreground">
                {detailLoading
                  ? "Loading saved session from MongoDB…"
                  : isEditing
                    ? "Edit mode — use Save on each tab to persist changes to MongoDB."
                    : saving
                      ? "Saving to MongoDB…"
                      : loadedSessionId
                        ? "View a project or click Edit on a card to change plan, issues, RAID, or minutes."
                        : "Select a project from the list to view its output."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {detailLoading || saving ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : null}
              {loadedSessionId && hasLoaded ? (
                <>
                  {isEditing ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSessionId(null);
                        void handleSaveSession();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-primary to-[#A65A2C] px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                      <Check className="h-4 w-4" />
                      Done editing
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={Boolean(deletingSessionId)}
                      onClick={() => handleEdit(loadedSessionId)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-black/[0.04] px-3 py-2 text-sm font-medium text-foreground hover:bg-black/[0.07] transition-colors disabled:opacity-50"
                    >
                      Edit project
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={Boolean(deletingSessionId) || isEditing}
                    onClick={() => {
                      const title =
                        sessions.find((s) => s.sessionId === loadedSessionId)?.title ?? loadedSessionId;
                      void handleDelete(loadedSessionId, title);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                  <Link
                    href="/workspace"
                    className="rounded-xl border border-border/50 bg-black/[0.04] px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-black/[0.07] transition-colors"
                  >
                    Open in workspace
                  </Link>
                </>
              ) : null}
            </div>
          </header>

          {detailError ? (
            <div className="mb-3 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {detailError}
            </div>
          ) : null}

          {saveError ? (
            <div className="mb-3 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {saveError}
            </div>
          ) : null}

          <DashboardTabs
            payload={payload}
            sessionId={loadedSessionId}
            isLoading={detailLoading}
            hasRun={hasLoaded}
            showEmpty={!hasLoaded && !detailLoading}
          />

          {transcript && hasLoaded ? (
            <details className="mt-4 shrink-0 rounded-xl glass-card">
              <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground">
                View stored transcript
              </summary>
              <pre className="max-h-48 overflow-auto border-t border-black/[0.05] p-4 text-xs whitespace-pre-wrap text-muted-foreground">
                {transcript}
              </pre>
            </details>
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
        <div className="flex flex-1 h-screen items-center justify-center text-sm text-muted-foreground">
          Loading projects…
        </div>
      }
    >
      <SessionViewContent />
    </Suspense>
  );
}
