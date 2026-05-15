"use client";

import { FileText, Loader2, Plus, Sparkles } from "lucide-react";
import { SAMPLE_TRANSCRIPT } from "@/lib/sampleTranscript";
import { cn } from "@/lib/cn";

export function TranscriptPanel({
  transcript,
  onTranscriptChange,
  sessionId,
  isLoading,
  error,
  onAnalyze,
  onNewMeeting,
  onLoadSample,
}: {
  transcript: string;
  onTranscriptChange: (value: string) => void;
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
  onAnalyze: () => void;
  onNewMeeting: () => void;
  onLoadSample: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--z-border)] px-4 py-4">
        <h1 className="text-lg font-semibold text-slate-900">TPM Agent</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Paste an MS Teams transcript to generate plans, issues, and minutes.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="transcript"
            className="text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            Meeting transcript
          </label>
          <button
            type="button"
            onClick={onLoadSample}
            disabled={isLoading}
            className="text-xs font-medium text-[var(--z-brand)] hover:underline disabled:opacity-50"
          >
            Load sample
          </button>
        </div>

        <textarea
          id="transcript"
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          disabled={isLoading}
          placeholder="Paste your MS Teams notetaker transcript here…"
          className={cn(
            "min-h-[280px] flex-1 resize-none rounded-lg border border-[var(--z-border)] bg-[var(--z-panel-2)] px-3 py-2.5 text-sm text-slate-800",
            "placeholder:text-slate-400 focus:border-[var(--z-brand)] focus:outline-none focus:ring-2 focus:ring-blue-100",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        />

        {sessionId ? (
          <p className="truncate font-mono text-[10px] text-slate-400" title={sessionId}>
            Session: {sessionId}
          </p>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onAnalyze}
            disabled={isLoading || !transcript.trim()}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white",
              "bg-[var(--z-brand)] hover:bg-[var(--z-brand-2)] disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analyze Meeting
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onNewMeeting}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--z-border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            New Meeting
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--z-border)] px-4 py-3">
        <div className="flex items-start gap-2 text-xs text-slate-500">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            TPM Agent analyzes your transcript and populates the project plan,
            issue tracker, tasks, and meeting minutes.
          </span>
        </div>
      </div>
    </div>
  );
}

export { SAMPLE_TRANSCRIPT };
