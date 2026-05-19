"use client";

import { formatDisplayValue } from "@/lib/agent/display";
import { cn } from "@/lib/cn";

type Props = {
  value: unknown;
  className?: string;
  /** When true, preserve newlines (e.g. comments). */
  multiline?: boolean;
  placeholder?: string;
};

/** Renders agent/parsed values without `[object Object]` or raw JSON leaks. */
export function SafeDisplay({
  value,
  className,
  multiline = false,
  placeholder = "—",
}: Props) {
  const text = formatDisplayValue(value);
  if (!text) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {placeholder}
      </span>
    );
  }

  if (multiline) {
    return (
      <span className={cn("whitespace-pre-wrap", className)}>{text}</span>
    );
  }

  return <span className={className}>{text}</span>;
}
