"use client";

import { useCallback, useEffect, useState } from "react";
import { TranscriptPanel } from "@/components/input/TranscriptPanel";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { SAMPLE_TRANSCRIPT } from "@/lib/sampleTranscript";
import { postAgent } from "@/lib/agentClient";
import { buildRefineMessage } from "@/lib/buildRefineMessage";
import { AGENT_ID, emptyParsed } from "@/lib/constants";
import { fetchSession, saveSession } from "@/lib/sessionStore";
import {
  clearStoredSessionId,
  generateSessionId,
  getStoredSessionId,
  setStoredSessionId,
} from "@/lib/session";
import type {
  AgentApiResponse,
  DashboardTabId,
  ParsedAgentResponse,
} from "@/types/tpm";

export default function WorkspacePage() {
  const [transcript, setTranscript] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedAgentResponse>(emptyParsed);
  const [rawReply, setRawReply] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    const stored = getStoredSessionId();
    if (!stored) return;
    setSessionId(stored);

    let cancelled = false;
    fetchSession(stored)
      .then((saved) => {
        if (cancelled || !saved) return;
        setParsed(saved.parsed);
        if (saved.transcript) setTranscript(saved.transcript);
        if (saved.rawReply) setRawReply(saved.rawReply);
        setHasRun(true);
      })
      .catch(() => {
        /* keep empty workspace if load fails */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const persistToDb = useCallback(
    async (sid: string, payload: Parameters<typeof saveSession>[1]) => {
      try {
        await saveSession(sid, payload);
        return true;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Could not save to database";
        setError((prev) => prev ?? `Save failed: ${msg}`);
        return false;
      }
    },
    []
  );

  const applyAgentResponse = useCallback(
    async (data: AgentApiResponse) => {
      const next = data.parsed ?? emptyParsed;
      setParsed(next);
      setRawReply(data.reply);
      setSessionId(data.session_id);
      setStoredSessionId(data.session_id);
      setHasRun(true);

      if (data.persisted === false && data.persist_error) {
        setError(`Database save failed: ${data.persist_error}`);
      }

      const saved = await persistToDb(data.session_id, {
        parsed: next,
        rawReply: data.reply,
        transcript: transcript.trim() || undefined,
      });

      if (data.persisted === false && saved) {
        setError(null);
      }
    },
    [transcript, persistToDb]
  );

  const handleAnalyze = useCallback(async () => {
    const trimmed = transcript.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);

    const sid =
      sessionId ?? getStoredSessionId() ?? generateSessionId(AGENT_ID);

    try {
      const data = await postAgent({
        message: trimmed,
        session_id: sid,
        mode: "analyze",
        transcript: trimmed,
      });
      await applyAgentResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsLoading(false);
    }
  }, [transcript, sessionId, applyAgentResponse]);

  const handleRefine = useCallback(
    async (
      prompt: string,
      activeTab: DashboardTabId,
      snapshot: unknown
    ) => {
      const sid = sessionId ?? getStoredSessionId();
      if (!sid || !hasRun) return;

      setIsLoading(true);
      setError(null);

      const message = buildRefineMessage(activeTab, snapshot, prompt);

      try {
        const data = await postAgent({
          message,
          session_id: sid,
          mode: "refine",
        });
        await applyAgentResponse(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Refinement failed";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, hasRun, applyAgentResponse]
  );

  const handleParsedChange = useCallback(
    (next: ParsedAgentResponse) => {
      setParsed(next);
      if (sessionId) {
        void persistToDb(sessionId, {
          parsed: next,
          transcript: transcript.trim() || undefined,
          rawReply: rawReply ?? undefined,
        });
      }
    },
    [sessionId, transcript, rawReply, persistToDb]
  );

  const handleNewMeeting = useCallback(() => {
    // Keep MongoDB history — only reset local workspace state.
    clearStoredSessionId();
    setSessionId(null);
    setTranscript("");
    setParsed(emptyParsed);
    setRawReply(null);
    setError(null);
    setHasRun(false);
  }, [sessionId]);

  const handleLoadSample = useCallback(() => {
    setTranscript(SAMPLE_TRANSCRIPT);
  }, []);

  const showEmpty = !hasRun && !isLoading;

  return (
    <div className="flex flex-1 overflow-hidden app-bg">
      {/* Left panel */}
      <aside className="w-[380px] flex-shrink-0 border-r border-border/50 flex flex-col bg-card/30 overflow-hidden">
        <TranscriptPanel
          transcript={transcript}
          onTranscriptChange={setTranscript}
          sessionId={sessionId}
          isLoading={isLoading}
          error={error}
          onAnalyze={handleAnalyze}
          onNewMeeting={handleNewMeeting}
          onLoadSample={handleLoadSample}
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto flex flex-col">
        <div className="p-4 md:p-6 flex flex-col flex-1">
          <header className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Workspace</h2>
              <p className="text-sm text-muted-foreground">
                Analyze transcripts and manage project plan, issues, tasks, and minutes
              </p>
            </div>
          </header>

          <DashboardTabs
            parsed={parsed}
            onParsedChange={handleParsedChange}
            sessionId={sessionId}
            isLoading={isLoading}
            hasRun={hasRun}
            showEmpty={showEmpty}
            onRefine={handleRefine}
          />

          {rawReply && hasRun ? (
            <details className="mt-4 shrink-0 rounded-xl glass-card">
              <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground">
                View raw agent response
              </summary>
              <pre className="max-h-48 overflow-auto border-t border-black/[0.05] p-4 text-xs whitespace-pre-wrap text-muted-foreground">
                {rawReply}
              </pre>
            </details>
          ) : null}
        </div>
      </main>
    </div>
  );
}
