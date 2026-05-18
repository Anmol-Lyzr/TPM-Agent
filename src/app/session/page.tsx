"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { SessionListPanel } from "@/components/session/SessionListPanel";
import { emptyParsed } from "@/lib/constants";
import {
  clearStoredSessionId,
  getStoredSessionId,
  setStoredSessionId,
} from "@/lib/session";
import {
  fetchSession,
  fetchSessionList,
  removeSession,
  type SessionListItem,
} from "@/lib/sessionStore";
import type { ParsedAgentResponse } from "@/types/tpm";

function SessionViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [loadedSessionId, setLoadedSessionId] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedAgentResponse>(emptyParsed);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [rawReply, setRawReply] = useState<string | null>(null);
  const [rawReplyLoading, setRawReplyLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null
  );
  const loadingIdRef = useRef<string | null>(null);
  const lastLoadedRef = useRef<string | null>(null);

  const refreshList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const list = await fetchSessionList();
      setSessions(list);
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : "Failed to load sessions"
      );
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const loadSession = useCallback(async (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) return;

    if (trimmed === lastLoadedRef.current) return;

    loadingIdRef.current = trimmed;
    setDetailLoading(true);
    setDetailError(null);
    setRawReply(null);

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
      setParsed(data.parsed);
      setTranscript(data.transcript ?? null);
      setHasLoaded(true);
      lastLoadedRef.current = trimmed;
    } catch (err) {
      if (loadingIdRef.current !== trimmed) return;
      setDetailError(
        err instanceof Error ? err.message : "Failed to load session"
      );
      setHasLoaded(false);
      lastLoadedRef.current = null;
    } finally {
      if (loadingIdRef.current === trimmed) {
        setDetailLoading(false);
      }
    }
  }, []);

  const loadRawReply = useCallback(async () => {
    if (!loadedSessionId || rawReply || rawReplyLoading) return;
    setRawReplyLoading(true);
    try {
      const data = await fetchSession(loadedSessionId, { includeRaw: true });
      if (data?.rawReply) setRawReply(data.rawReply);
    } finally {
      setRawReplyLoading(false);
    }
  }, [loadedSessionId, rawReply, rawReplyLoading]);

  // Load session from URL only — avoids fight between replaceState and useSearchParams.
  useEffect(() => {
    const fromUrl = searchParams.get("id")?.trim();
    if (!fromUrl || listLoading) return;
    void loadSession(fromUrl);
  }, [searchParams, listLoading, loadSession]);

  const handleSelect = useCallback(
    (sessionId: string) => {
      const trimmed = sessionId.trim();
      if (!trimmed) return;
      if (trimmed === searchParams.get("id")?.trim() && hasLoaded) return;
      router.replace(`/session?id=${encodeURIComponent(trimmed)}`, {
        scroll: false,
      });
    },
    [router, searchParams, hasLoaded]
  );

  const clearViewer = useCallback(() => {
    loadingIdRef.current = null;
    lastLoadedRef.current = null;
    setLoadedSessionId(null);
    setParsed(emptyParsed);
    setTranscript(null);
    setRawReply(null);
    setHasLoaded(false);
    setDetailError(null);
    setDetailLoading(false);
  }, []);

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

        const urlId = searchParams.get("id")?.trim();
        if (urlId === trimmed || loadedSessionId === trimmed) {
          clearViewer();
          router.replace("/session", { scroll: false });
        }
      } catch (err) {
        setListError(
          err instanceof Error ? err.message : "Failed to delete session"
        );
      } finally {
        setDeletingSessionId(null);
      }
    },
    [
      deletingSessionId,
      searchParams,
      loadedSessionId,
      clearViewer,
      router,
    ]
  );

  return (
    <div className="flex flex-1 overflow-hidden app-bg">
      {/* Left panel */}
      <aside className="w-[380px] flex-shrink-0 border-r border-border/50 flex flex-col bg-card/30 overflow-hidden">
        <SessionListPanel
          sessions={sessions}
          listLoading={listLoading}
          listError={listError}
          selectedSessionId={loadedSessionId}
          detailLoading={detailLoading}
          onSelect={handleSelect}
          onRefresh={() => void refreshList()}
          onDelete={(id, title) => void handleDelete(id, title)}
          deletingSessionId={deletingSessionId}
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto flex flex-col">
        <div className="p-4 md:p-6 flex flex-col flex-1">
          <header className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold tracking-tight text-foreground">Session viewer</h2>
              <p className="text-sm text-muted-foreground">
                {detailLoading
                  ? "Loading saved session from MongoDB…"
                  : loadedSessionId
                    ? "Read-only view of the selected session"
                    : "Select a session from the list to view its output"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {detailLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : null}
              {loadedSessionId && hasLoaded ? (
                <>
                  <button
                    type="button"
                    disabled={Boolean(deletingSessionId)}
                    onClick={() => {
                      const title =
                        sessions.find((s) => s.sessionId === loadedSessionId)
                          ?.title ?? loadedSessionId;
                      void handleDelete(loadedSessionId, title);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                  <Link
                    href="/workspace"
                    onClick={() => setStoredSessionId(loadedSessionId)}
                    className="rounded-xl border border-border/50 bg-black/[0.04] px-3 py-2 text-sm font-medium text-foreground hover:bg-black/[0.07] transition-colors"
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

          <DashboardTabs
            parsed={parsed}
            onParsedChange={() => {}}
            sessionId={loadedSessionId}
            isLoading={detailLoading}
            hasRun={hasLoaded}
            showEmpty={!hasLoaded && !detailLoading}
            readOnly
            loadingMessage="Loading saved session…"
            loadingSubmessage="Fetching meeting output from MongoDB."
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

          {hasLoaded ? (
            <details
              className="mt-4 shrink-0 rounded-xl glass-card"
              onToggle={(e) => {
                if ((e.target as HTMLDetailsElement).open) void loadRawReply();
              }}
            >
              <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground">
                View raw agent response
                {rawReplyLoading ? " (loading…)" : null}
              </summary>
              {rawReply ? (
                <pre className="max-h-48 overflow-auto border-t border-black/[0.05] p-4 text-xs whitespace-pre-wrap text-muted-foreground">
                  {rawReply}
                </pre>
              ) : rawReplyLoading ? (
                <p className="border-t border-black/[0.05] p-4 text-xs text-muted-foreground">
                  Loading raw response…
                </p>
              ) : null}
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
          Loading session viewer…
        </div>
      }
    >
      <SessionViewContent />
    </Suspense>
  );
}
