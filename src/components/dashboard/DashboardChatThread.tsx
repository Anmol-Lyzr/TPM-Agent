"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Loader2, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { ChatMessage } from "@/hooks/useConsoleChat";

interface DashboardChatThreadProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  onNewChat: () => void;
}

export function DashboardChatThread({
  messages,
  isLoading,
  error,
  onNewChat,
}: DashboardChatThreadProps) {
  if (messages.length === 0 && !isLoading && !error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 w-full max-w-2xl text-left"
    >
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          Agent response
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/console"
            className="text-[10px] font-medium text-primary hover:text-primary/80"
          >
            Continue in console
          </Link>
          <button
            type="button"
            onClick={onNewChat}
            className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3 h-3" />
            New chat
          </button>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4 space-y-4 max-h-[min(420px,50vh)] overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex gap-2.5", msg.role === "user" && "flex-row-reverse")}
          >
            {msg.role === "assistant" ? (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                <Bot className="h-3 w-3 text-primary" />
              </div>
            ) : (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-[9px] font-bold text-primary">
                You
              </div>
            )}
            <div
              className={cn(
                "flex-1 min-w-0 text-sm leading-relaxed",
                msg.role === "user"
                  ? "rounded-xl bg-gradient-to-br from-primary to-[#A65A2C] px-3 py-2 text-white"
                  : "text-foreground prose-agent text-sm"
              )}
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            Thinking…
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
            {error}
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}
