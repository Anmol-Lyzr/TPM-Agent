"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  Square,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useConsoleChat, type ChatRole } from "@/hooks/useConsoleChat";
import {
  fetchSession,
  fetchSessionList,
  type SessionListItem,
} from "@/lib/sessionStore";

const SUGGESTED_PROMPTS = [
  "What were the key decisions from this meeting?",
  "Summarize open RAID items and who owns them.",
  "Which Jira issues are still open or blocked?",
  "List action items with owners and due dates.",
];

export function AgentConsolePanel() {
  const [meetingSessionId, setMeetingSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [meetingTitle, setMeetingTitle] = useState<string | null>(null);
  const [meetingStats, setMeetingStats] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    error,
    chatSessionId,
    handleNewChat,
    handleStop,
  } = useConsoleChat(meetingSessionId);

  useEffect(() => {
    let cancelled = false;
    setSessionsLoading(true);
    fetchSessionList()
      .then((list) => {
        if (!cancelled) setSessions(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setSessionsError(
            err instanceof Error ? err.message : "Failed to load projects"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!meetingSessionId) {
      setMeetingTitle(null);
      setMeetingStats(null);
      return;
    }

    let cancelled = false;
    fetchSession(meetingSessionId)
      .then((data) => {
        if (cancelled || !data) return;
        const title =
          data.payload?.metadata?.meeting_title?.trim() ||
          sessions.find((s) => s.sessionId === meetingSessionId)?.title ||
          "Selected meeting";
        setMeetingTitle(title);
        const issuesCount = data.payload?.issue_tracker?.length ?? 0;
        const milestones = data.payload?.project_plan?.milestones ?? [];
        const planCount = milestones.reduce((n, m) => n + m.tasks.length, 0);
        const raidCount =
          (data.payload?.raid_log?.risks?.length ?? 0) +
          (data.payload?.raid_log?.assumptions?.length ?? 0) +
          (data.payload?.raid_log?.issues?.length ?? 0) +
          (data.payload?.raid_log?.dependencies?.length ?? 0);
        setMeetingStats(`${planCount} plan · ${issuesCount} issues · ${raidCount} RAID`);
      })
      .catch(() => {
        if (!cancelled) setMeetingStats(null);
      });

    return () => {
      cancelled = true;
    };
  }, [meetingSessionId, sessions]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] min-h-0 overflow-hidden app-bg">
      {/* Main chat pane */}
      <div className="flex min-w-0 flex-1 flex-col relative overflow-hidden">
        <div className="glass sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-foreground">
                Agent Console
              </h1>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[hsl(var(--success))]" />
                Meeting intelligence · ask anything
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleNewChat}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New chat
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 space-y-6 overflow-y-auto px-4 py-5 md:px-6"
        >
          {messages.length === 0 && !isLoading ? (
            <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/[0.08]">
                <MessageSquare className="h-8 w-8 text-primary/50" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Ask about your meeting data
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Select a project on the right, then ask about decisions, RAID
                items, issues, plan tasks, or the transcript.
              </p>
              <div className="mt-6 flex w-full max-w-lg flex-wrap justify-center gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    disabled={!meetingSessionId || isLoading}
                    className={cn(
                      "rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors",
                      meetingSessionId &&
                        "hover:border-primary/30 hover:bg-primary/5 hover:text-foreground",
                      !meetingSessionId && "cursor-not-allowed opacity-50"
                    )}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              {!meetingSessionId ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  Pick a meeting project in the sidebar to enable prompts.
                </p>
              ) : null}
            </div>
          ) : null}

          {messages.map((msg) => (
            <ChatBubble key={msg.id} role={msg.role} content={msg.content} />
          ))}

          {isLoading ? (
            <div className="flex gap-3">
              <AgentAvatar />
              <div className="glass-card flex items-center gap-2 rounded-xl px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Thinking…</span>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="glass shrink-0 px-4 py-3.5 md:px-6">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-5xl items-end gap-3"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(input);
                }
              }}
              disabled={isLoading}
              rows={1}
              placeholder={
                meetingSessionId
                  ? "Ask about this meeting…"
                  : "Select a meeting project, then ask a question…"
              }
              className={cn(
                "glass-input max-h-32 min-h-[44px] flex-1 resize-none rounded-xl px-4 py-3 text-sm",
                "focus:outline-none placeholder:text-muted-foreground/40 disabled:opacity-60"
              )}
            />
            {isLoading ? (
              <button
                type="button"
                onClick={handleStop}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/80 text-muted-foreground hover:bg-background"
                title="Stop"
              >
                <Square className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#A65A2C] text-primary-foreground shadow-[0_4px_16px_hsla(24,58%,25%,0.2)] disabled:opacity-40"
                title="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Context sidebar */}
      <aside className="glass-card hidden w-72 shrink-0 flex-col overflow-y-auto border-l border-black/[0.04] p-4 lg:flex">
        <section className="space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Meeting project
          </h2>
          {sessionsLoading ? (
            <p className="text-xs text-muted-foreground">Loading projects…</p>
          ) : sessionsError ? (
            <p className="text-xs text-destructive">{sessionsError}</p>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No saved meetings yet.{" "}
              <Link href="/session" className="text-primary hover:underline">
                Create a new project
              </Link>{" "}
              to start.
            </p>
          ) : (
            <ul className="max-h-[280px] space-y-1 overflow-y-auto">
              {sessions.map((s) => {
                const active = meetingSessionId === s.sessionId;
                return (
                  <li key={s.sessionId}>
                    <button
                      type="button"
                      onClick={() =>
                        setMeetingSessionId(
                          active ? null : s.sessionId
                        )
                      }
                      className={cn(
                        "w-full rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                        active
                          ? "bg-primary/10 text-foreground ring-1 ring-primary/20"
                          : "text-muted-foreground hover:bg-black/[0.04] hover:text-foreground"
                      )}
                    >
                      <span className="line-clamp-2 font-medium">{s.title}</span>
                      <span className="mt-0.5 block text-[10px] opacity-70">
                        {s.planCount} plan · {s.issuesCount} issues ·{" "}
                        {s.raidCount} RAID
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {meetingSessionId && meetingTitle ? (
          <section className="phase-context-banner mt-5 rounded-xl p-3">
            <p className="text-xs font-medium text-foreground">{meetingTitle}</p>
            {meetingStats ? (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {meetingStats}
              </p>
            ) : null}
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              Meeting context is attached to each message so the agent can answer
              from your plan, issues, RAID log, minutes, and transcript.
            </p>
          </section>
        ) : null}

        <section className="mt-5 space-y-2 border-t border-black/[0.06] pt-4">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Chat session
          </h2>
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground break-all">
            {chatSessionId ?? "New conversation (starts on first message)"}
          </p>
        </section>
      </aside>
    </div>
  );
}

function AgentAvatar() {
  return (
    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
      <Bot className="h-3.5 w-3.5 text-primary" />
    </div>
  );
}

function ChatBubble({ role, content }: { role: ChatRole; content: string }) {
  const isUser = role === "user";

  return (
    <div
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
    >
      {isUser ? (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-[10px] font-bold text-primary">
          You
        </div>
      ) : (
        <AgentAvatar />
      )}
      <div
        className={cn(
          "max-w-[min(100%,42rem)]",
          isUser
            ? "rounded-xl bg-gradient-to-br from-primary to-[#A65A2C] px-4 py-3 text-white shadow-[0_4px_16px_hsla(24,58%,25%,0.15)]"
            : "glass-card rounded-xl px-5 py-4"
        )}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
      </div>
    </div>
  );
}
