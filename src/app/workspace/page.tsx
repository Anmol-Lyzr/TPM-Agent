"use client";

import { useCallback, useEffect, useState } from "react";
import { TranscriptPanel } from "@/components/input/TranscriptPanel";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { SAMPLE_TRANSCRIPT } from "@/lib/sampleTranscript";
import { postAgent } from "@/lib/agentClient";
import { AGENT_ID } from "@/lib/constants";
import { fetchSession, saveSession } from "@/lib/sessionStore";
import {
  clearStoredSessionId,
  generateSessionId,
  getStoredSessionId,
  setStoredSessionId,
} from "@/lib/session";
import type { MeetingMinutesPayload } from "@/types/meetingPayload";

const SAMPLE_PROJECT_NAME = "HS H3M Data One";

export default function WorkspacePage() {
  const [transcript, setTranscript] = useState("");
  const [projectName, setProjectName] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [payload, setPayload] = useState<MeetingMinutesPayload | null>(null);
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
        setPayload(saved.payload ?? null);
        if (saved.projectName) setProjectName(saved.projectName);
        if (saved.transcript) setTranscript(saved.transcript);
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
    async (sid: string, data: { payload: MeetingMinutesPayload | null; projectName?: string; transcript?: string }) => {
      try {
        await saveSession(sid, data);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not save to database";
        setError((prev) => prev ?? `Save failed: ${msg}`);
        return false;
      }
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
    const explicitProjectName = projectName.trim() || undefined;

    try {
      const data = await postAgent({
        message: trimmed,
        session_id: sid,
        mode: "analyze",
        transcript: trimmed,
        project_name: explicitProjectName,
      });

      setPayload(data.payload);
      setSessionId(data.session_id);
      setProjectName(explicitProjectName ?? data.payload?.metadata?.meeting_title?.trim() ?? "");
      setStoredSessionId(data.session_id);
      setHasRun(true);

      if (data.persisted === false && data.persist_error) {
        setError(`Database save failed: ${data.persist_error}`);
      }

      await persistToDb(data.session_id, {
        payload: data.payload,
        projectName: explicitProjectName,
        transcript: trimmed || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsLoading(false);
    }
  }, [transcript, sessionId, projectName, persistToDb]);

  const handleNewMeeting = useCallback(() => {
    clearStoredSessionId();
    setSessionId(null);
    setProjectName("");
    setTranscript("");
    setPayload(null);
    setError(null);
    setHasRun(false);
  }, []);

  const handleLoadSample = useCallback(() => {
    setProjectName(SAMPLE_PROJECT_NAME);
    setTranscript(SAMPLE_TRANSCRIPT);
  }, []);

  const showEmpty = !hasRun && !isLoading;

  return (
    <div className="flex flex-1 overflow-hidden app-bg">
      {/* Left panel */}
      <aside className="w-[380px] flex-shrink-0 border-r border-border/50 flex flex-col bg-card/30 overflow-hidden">
        <TranscriptPanel
          transcript={transcript}
          projectName={projectName}
          onProjectNameChange={setProjectName}
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
                Analyze transcripts and manage project plan, issues, RAID log, and minutes
              </p>
            </div>
          </header>

          <DashboardTabs
            payload={payload}
            sessionId={sessionId}
            isLoading={isLoading}
            hasRun={hasRun}
            showEmpty={showEmpty}
          />
        </div>
      </main>
    </div>
  );
}
