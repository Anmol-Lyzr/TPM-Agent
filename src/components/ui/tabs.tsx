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
            "rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors",
            active === t.key
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-black/[0.04] text-muted-foreground hover:text-foreground hover:bg-black/[0.07]"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
