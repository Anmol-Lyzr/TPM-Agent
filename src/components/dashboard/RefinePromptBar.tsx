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
    <div className="rounded-lg border border-[var(--z-border)] bg-[var(--z-panel-2)] p-3">
      <p className="mb-2 text-xs font-medium text-slate-700">
        Refine with AI
      </p>
      <p className="mb-2 text-[11px] text-slate-500">
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
          "mb-2 w-full resize-none rounded-lg border border-[var(--z-border)] bg-white px-3 py-2 text-sm text-slate-800",
          "placeholder:text-slate-400 focus:border-[var(--z-brand)] focus:outline-none focus:ring-2 focus:ring-blue-100",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      />
      <button
        type="button"
        onClick={onApply}
        disabled={disabled || isLoading || !value.trim()}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--z-brand)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--z-brand-2)] disabled:opacity-50"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {isLoading ? "Applying…" : "Apply changes"}
      </button>
    </div>
  );
}
