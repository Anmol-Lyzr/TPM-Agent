import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function PanelHeader({
  icon: Icon,
  title,
  subtitle,
  count,
  actions,
  className,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  count?: number;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-[var(--z-border)] px-4 py-3",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle ? (
            <p className="text-xs text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        {count !== undefined ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {count}
          </span>
        ) : null}
      </div>
    </div>
  );
}
