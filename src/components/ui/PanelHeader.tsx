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
        "flex items-start justify-between gap-3 border-b border-border/50 px-4 py-3",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        {count !== undefined ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary">
            {count}
          </span>
        ) : null}
      </div>
    </div>
  );
}
