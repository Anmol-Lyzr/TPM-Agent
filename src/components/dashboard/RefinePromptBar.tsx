"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

export function RefinePromptBar({
  value,
  onChange,
  onApply,
  isLoading,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
  isLoading: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="glass-card rounded-xl p-3">
      <p className="mb-2 text-xs font-medium text-foreground">
        Refine with AI
      </p>
      <p className="mb-2 text-[11px] text-muted-foreground">
        Describe changes to the active tab. The TPM Agent will update the
        dashboard output.
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || isLoading}
        placeholder='e.g. "Change SCRUM-12 due date to 25 May" or "Add a row for security audit"'
        rows={2}
        className={cn(
          "mb-2 w-full resize-none rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm text-foreground",
          "placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      />
      <button
        type="button"
        onClick={onApply}
        disabled={disabled || isLoading || !value.trim()}
        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-primary to-[#A65A2C] px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {isLoading ? "Applying…" : "Apply changes"}
      </button>
    </div>
  );
}
