"use client";

import { FileText, Loader2, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

export function TranscriptPanel({
  transcript,
  projectName,
  onProjectNameChange,
  onTranscriptChange,
  sessionId,
  isLoading,
  error,
  onAnalyze,
  onNewMeeting,
  onLoadSample,
}: {
  transcript: string;
  projectName: string;
  onProjectNameChange: (value: string) => void;
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
      <div className="border-b border-border/50 px-4 py-4">
        <h1 className="text-lg font-semibold text-foreground">TPM Agent</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Paste an MS Teams transcript to generate plans, issues, and minutes. Use Load sample for a Hunt Military Communities Resident Connect meeting template.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="projectName"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Project name
          </label>
        </div>

        <input
          id="projectName"
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          disabled={isLoading}
          placeholder="Enter project name..."
          className={cn(
            "h-10 rounded-lg border border-border/50 bg-background/60 px-3 text-sm text-foreground",
            "placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        />

        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="transcript"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Meeting transcript
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLoadSample}
              disabled={isLoading}
              className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              Load sample (HMC)
            </button>
          </div>
        </div>

        <textarea
          id="transcript"
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          disabled={isLoading}
          placeholder="Paste your MS Teams notetaker transcript here…"
          className={cn(
            "min-h-[280px] flex-1 resize-none rounded-lg border border-border/50 bg-background/60 px-3 py-2.5 text-sm text-foreground",
            "placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        />

        {sessionId ? (
          <p className="truncate font-mono text-[10px] text-muted-foreground/70" title={sessionId}>
            Session: {sessionId}
          </p>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onAnalyze}
            disabled={isLoading || !transcript.trim()}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold",
              isLoading
                ? "bg-primary/20 text-primary/60 cursor-wait"
                : "bg-gradient-to-br from-primary to-[#A65A2C] text-primary-foreground hover:opacity-90 shadow-sm",
              "disabled:cursor-not-allowed disabled:opacity-50"
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
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/50 bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            New Meeting
          </button>
        </div>
      </div>

      <div className="border-t border-border/50 px-4 py-3">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            TPM Agent analyzes your transcript and populates the project plan,
            issue tracker, RAID log, and meeting minutes.
          </span>
        </div>
      </div>
    </div>
  );
}
