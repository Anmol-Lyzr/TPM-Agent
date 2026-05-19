"use client";

import { motion } from "framer-motion";
import {
  Send,
  Mic,
  Paperclip,
  ArrowRight,
  ListTodo,
  Bug,
  FileText,
  Sparkles,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

const INTEGRATIONS = [
  { name: "Jira", domain: "atlassian.com" },
  { name: "Confluence", domain: "atlassian.com" },
  { name: "Slack", domain: "slack.com" },
  { name: "Google Drive", domain: "drive.google.com" },
  { name: "Google Calendar", domain: "calendar.google.com" },
  { name: "GitHub", domain: "github.com" },
  { name: "Microsoft Teams", domain: "microsoft.com" },
  { name: "Smartsheet", domain: "smartsheet.com" },
];

export interface DashboardSuggestedAction {
  label: string;
  detail: string;
  prompt: string;
}

const QUICK_CHIPS: { icon: typeof ListTodo; label: string; prompt: string }[] = [
  {
    icon: FileText,
    label: "Summarize meeting decisions",
    prompt: "What were the key decisions and action items from the latest meeting?",
  },
  {
    icon: ListTodo,
    label: "Review open RAID items",
    prompt: "Summarize open RAID log items with owners and severity.",
  },
  {
    icon: Bug,
    label: "List blocked Jira issues",
    prompt: "Which Jira issues are blocked or still open, and who owns them?",
  },
  {
    icon: Sparkles,
    label: "Find project plan gaps",
    prompt: "Highlight gaps or risks in the project plan based on meeting outputs.",
  },
];

interface DashboardSearchBarProps {
  query: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  suggestedActions: DashboardSuggestedAction[];
  onSuggestedPrompt: (prompt: string) => void;
  isLoading?: boolean;
}

export function DashboardSearchBar({
  query,
  onChange,
  onSubmit,
  suggestedActions,
  onSuggestedPrompt,
  isLoading = false,
}: DashboardSearchBarProps) {
  return (
    <div className="mt-6 w-full max-w-2xl">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          disabled={isLoading}
          placeholder="Ask about meetings, RAID items, Jira issues, or project plans…"
          className="w-full glass-input rounded-[18px] pl-5 pr-28 py-4 text-sm focus:outline-none placeholder:text-muted-foreground/40 disabled:opacity-60"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          <label
            className="p-2 rounded-xl text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
            title="Attach file (coming soon)"
          >
            <Paperclip className="w-4 h-4" />
            <input type="file" className="hidden" disabled />
          </label>
          <button
            type="button"
            className="p-2 rounded-xl text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors"
            title="Voice input (coming soon)"
            disabled
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!query.trim() || isLoading}
            className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-[#A65A2C] text-white hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2.5 flex-wrap justify-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mr-1">
          Integrated Systems
        </span>
        {INTEGRATIONS.map((intg) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={intg.name}
            src={`https://www.google.com/s2/favicons?domain=${intg.domain}&sz=32`}
            alt={intg.name}
            title={intg.name}
            className="w-5 h-5 rounded object-contain opacity-60 hover:opacity-100 transition-opacity"
          />
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2 mt-3">
        {QUICK_CHIPS.map(({ icon: Icon, label, prompt }) => (
          <button
            key={label}
            type="button"
            disabled={isLoading}
            onClick={() => onSuggestedPrompt(prompt)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-muted-foreground bg-primary/[0.06] hover:bg-primary/[0.12] hover:text-primary border border-primary/10 transition-all disabled:opacity-50"
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-4 w-full rounded-xl overflow-hidden text-left bg-white/[0.2] backdrop-blur-xl border border-white/[0.18] shadow-sm"
      >
        <div className="px-3.5 py-1.5 border-b border-white/[0.15] flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/40">
            Suggested Actions
          </p>
          <Link
            href="/console"
            className="text-[10px] font-medium text-primary hover:text-primary/80"
          >
            Open console →
          </Link>
        </div>
        {suggestedActions.map((action, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => onSuggestedPrompt(action.prompt)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-white/[0.3] transition-colors cursor-pointer group text-left disabled:opacity-50",
              idx !== 0 && "border-t border-white/[0.12]"
            )}
          >
            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3 h-3 text-primary/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-foreground/80 truncate">{action.label}</p>
              <p className="text-[10px] text-muted-foreground/60 truncate">{action.detail}</p>
            </div>
            <ArrowRight className="w-3 h-3 text-primary/0 group-hover:text-primary/50 transition-colors flex-shrink-0" />
          </button>
        ))}
      </motion.div>
    </div>
  );
}
