"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TranscriptPanel } from "@/components/input/TranscriptPanel";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { SAMPLE_TRANSCRIPT } from "@/lib/sampleTranscript";
import { buildRefineMessage } from "@/lib/buildRefineMessage";
import {
  clearPersistedParsed,
  getTabSnapshot,
  loadParsed,
  persistParsed,
} from "@/lib/dashboardState";
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

const AGENT_ID = "6a06c9cbc5ab512e5b0d21e5";

const emptyParsed: ParsedAgentResponse = {
  issues: [],
  projectPlan: [],
  tasks: [],
  meetingMinutes: {
    attendees: [],
    decisions: [],
    actionItems: [],
    risks: [],
    openQuestions: [],
  },
  confluenceLink: null,
  rawSections: {},
  sections: { confluence: "", jira: "", smartsheet: "" },
};

export default function HomePage() {
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
    const saved = loadParsed(stored);
    if (saved) {
      setParsed(saved);
      setHasRun(true);
    }
  }, []);

  const applyAgentResponse = useCallback(
    (data: AgentApiResponse) => {
      const next = data.parsed ?? emptyParsed;
      setParsed(next);
      setRawReply(data.reply);
      setSessionId(data.session_id);
      setStoredSessionId(data.session_id);
      persistParsed(data.session_id, next);
      setHasRun(true);
    },
    []
  );

  const handleAnalyze = useCallback(async () => {
    const trimmed = transcript.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);

    const sid =
      sessionId ?? getStoredSessionId() ?? generateSessionId(AGENT_ID);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          session_id: sid,
          mode: "analyze",
        }),
      });

      const data = (await res.json()) as AgentApiResponse & { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      applyAgentResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsLoading(false);
    }
  }, [transcript, sessionId, applyAgentResponse]);

  const handleRefine = useCallback(
    async (prompt: string, activeTab: DashboardTabId) => {
      const sid = sessionId ?? getStoredSessionId();
      if (!sid || !hasRun) return;

      setIsLoading(true);
      setError(null);

      const snapshot = getTabSnapshot(parsed, activeTab);
      const message = buildRefineMessage(activeTab, snapshot, prompt);

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            session_id: sid,
            mode: "refine",
            context: { activeTab, snapshot },
          }),
        });

        const data = (await res.json()) as AgentApiResponse & { error?: string };

        if (!res.ok) {
          throw new Error(data.error ?? `Request failed (${res.status})`);
        }

        applyAgentResponse(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Refinement failed");
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, hasRun, parsed, applyAgentResponse]
  );

  const handleParsedChange = useCallback((next: ParsedAgentResponse) => {
    setParsed(next);
    if (sessionId) persistParsed(sessionId, next);
  }, [sessionId]);

  const handleNewMeeting = useCallback(() => {
    const sid = sessionId ?? getStoredSessionId();
    if (sid) clearPersistedParsed(sid);
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
    <AppShell
      leftPanel={
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
      }
    >
      <header className="mb-4 shrink-0">
        <h2 className="text-xl font-semibold text-slate-900">
          Meeting Intelligence Dashboard
        </h2>
        <p className="text-sm text-slate-500">
          Project plan, issues, tasks, and minutes from your TPM Agent
        </p>
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
        <details className="mt-4 shrink-0 rounded-lg border border-[var(--z-border)] bg-white">
          <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-slate-500">
            View raw agent response
          </summary>
          <pre className="max-h-48 overflow-auto border-t border-[var(--z-border)] p-4 text-xs text-slate-600 whitespace-pre-wrap">
            {rawReply}
          </pre>
        </details>
      ) : null}
    </AppShell>
  );
}
