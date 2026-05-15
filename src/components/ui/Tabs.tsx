"use client";

import { cn } from "@/lib/cn";

export type TabKey = string;

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { key: TabKey; label: string }[];
  active: TabKey;
  onChange: (key: TabKey) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="tablist"
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            active === t.key
              ? "border-[var(--z-border)] bg-white text-slate-900 shadow-sm"
              : "border-transparent bg-transparent text-slate-600 hover:bg-[var(--z-hover)] hover:text-slate-900"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
