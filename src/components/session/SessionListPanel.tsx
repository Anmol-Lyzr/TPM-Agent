"use client";

import { Calendar, FileText, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SessionListItem } from "@/lib/sessionStore";

function formatWhen(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
      {label} {value}
    </span>
  );
}

export function SessionListPanel({
  sessions,
  listLoading,
  listError,
  selectedSessionId,
  detailLoading,
  onSelect,
  onRefresh,
  onDelete,
  deletingSessionId,
}: {
  sessions: SessionListItem[];
  listLoading: boolean;
  listError: string | null;
  selectedSessionId: string | null;
  detailLoading: boolean;
  deletingSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onRefresh: () => void;
  onDelete: (sessionId: string, title: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/50 px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Saved sessions</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              All TPM sessions stored in MongoDB. Select one to view.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={listLoading}
            title="Refresh list"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-card text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
          >
            <RefreshCw
              className={cn("h-4 w-4", listLoading && "animate-spin")}
            />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
        {listError ? (
          <p className="mb-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {listError}
          </p>
        ) : null}

        {listLoading && sessions.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            Loading sessions…
          </div>
        ) : null}

        {!listLoading && sessions.length === 0 && !listError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2 text-center text-sm text-muted-foreground">
            <FileText className="h-8 w-8 text-muted-foreground/30" />
            <p>No saved sessions yet.</p>
            <p className="text-xs">
              Analyze a transcript in the workspace to create one.
            </p>
          </div>
        ) : null}

        {sessions.length > 0 ? (
          <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {sessions.map((session) => {
              const selected = session.sessionId === selectedSessionId;
              const loadingThis = selected && detailLoading;
              const deleting = deletingSessionId === session.sessionId;

              return (
                <li
                  key={session.sessionId}
                  className={cn(
                    "flex overflow-hidden rounded-xl border transition-colors",
                    selected
                      ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/50 bg-card/60",
                    detailLoading && !selected && "opacity-50",
                    deleting && "opacity-60"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(session.sessionId)}
                    disabled={(detailLoading && !selected) || deleting}
                    className="min-w-0 flex-1 px-3 py-3 text-left hover:bg-black/[0.03] disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium text-foreground">
                        {session.title}
                      </p>
                      {loadingThis ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                      ) : null}
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {formatWhen(session.updatedAt)}
                    </p>
                    <p className="mt-2 flex flex-wrap gap-1.5">
                      <StatPill label="Plan" value={session.planCount} />
                      <StatPill label="Issues" value={session.issuesCount} />
                      <StatPill label="Tasks" value={session.tasksCount} />
                      {session.hasTranscript ? (
                        <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                          Transcript
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-2 truncate font-mono text-[10px] text-muted-foreground/60">
                      {session.sessionId}
                    </p>
                  </button>
                  <button
                    type="button"
                    title="Delete session"
                    disabled={Boolean(deletingSessionId)}
                    onClick={() => onDelete(session.sessionId, session.title)}
                    className="flex w-10 shrink-0 items-center justify-center border-l border-border/50 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
