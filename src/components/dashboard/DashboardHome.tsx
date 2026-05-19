"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Logo from "@/components/logo/Logo";
import { DashboardSearchBar, type DashboardSuggestedAction } from "@/components/dashboard/DashboardSearchBar";
import { DashboardChatThread } from "@/components/dashboard/DashboardChatThread";
import { DashboardStatsSection } from "@/components/dashboard/DashboardStatsSection";
import { useConsoleChat } from "@/hooks/useConsoleChat";
import { fetchSessionList, type SessionListItem } from "@/lib/sessionStore";

const DEFAULT_SUGGESTED: DashboardSuggestedAction[] = [
  {
    label: "Summarize open RAID items across projects",
    detail: "Owners, severity, and status from stored meeting outputs",
    prompt: "Summarize all open RAID log items with owners and recommended next steps.",
  },
  {
    label: "Review blocked or open Jira issues",
    detail: "Issues synced from meeting analysis",
    prompt: "Which Jira issues are blocked or still open, and who owns them?",
  },
  {
    label: "Highlight project plan gaps",
    detail: "Compare plan tasks to decisions and action items",
    prompt: "Highlight gaps or risks in the project plan based on recent meeting outputs.",
  },
  {
    label: "Draft meeting follow-up email",
    detail: "Decisions, action items, and owners",
    prompt: "Draft a concise follow-up email with key decisions and action items from the latest meeting.",
  },
  {
    label: "List overdue action items",
    detail: "From minutes and RAID across sessions",
    prompt: "List action items that appear overdue or missing owners across stored sessions.",
  },
];

function buildSuggestedFromSessions(sessions: SessionListItem[]): DashboardSuggestedAction[] {
  return sessions.slice(0, 5).map((s) => ({
    label: `Ask about “${s.title.length > 42 ? `${s.title.slice(0, 42)}…` : s.title}”`,
    detail: `${s.planCount} plan · ${s.issuesCount} issues · ${s.raidCount} RAID`,
    prompt: `For the meeting "${s.title}": summarize key decisions, open RAID items, and blocked Jira issues.`,
  }));
}

export function DashboardHome() {
  const [query, setQuery] = useState("");
  const [sessions, setSessions] = useState<SessionListItem[]>([]);

  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    error,
    handleNewChat,
  } = useConsoleChat(null);

  useEffect(() => {
    fetchSessionList()
      .then(setSessions)
      .catch(() => setSessions([]));
  }, []);

  const suggestedActions = useMemo(
    () =>
      sessions.length > 0 ? buildSuggestedFromSessions(sessions) : DEFAULT_SUGGESTED,
    [sessions]
  );

  const handleSubmit = useCallback(() => {
    const text = (query || input).trim();
    if (!text) return;
    setQuery("");
    void sendMessage(text);
  }, [query, input, sendMessage]);

  const handleSuggestedPrompt = useCallback(
    (prompt: string) => {
      setQuery(prompt);
      setInput(prompt);
      void sendMessage(prompt);
    },
    [sendMessage, setInput]
  );

  return (
    <div className="px-4 py-5 sm:px-6 max-w-[1050px] mx-auto space-y-10">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center text-center pt-4 pb-2"
      >
        <div className="mb-4 flex items-center gap-2.5">
          <Logo size={36} />
          <span className="text-2xl font-semibold text-foreground">TPM Agent</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Welcome, <span className="text-primary">TPM Lead</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-lg">
          Meeting intelligence for technical program managers — plans, RAID logs, Jira issues, and
          minutes from your transcripts
        </p>

        <DashboardSearchBar
          query={query || input}
          onChange={(val) => {
            setQuery(val);
            setInput(val);
          }}
          onSubmit={handleSubmit}
          suggestedActions={suggestedActions}
          onSuggestedPrompt={handleSuggestedPrompt}
          isLoading={isLoading}
        />

        <DashboardChatThread
          messages={messages}
          isLoading={isLoading}
          error={error}
          onNewChat={handleNewChat}
        />
      </motion.div>

      <DashboardStatsSection />
    </div>
  );
}
