import { cn } from "@/lib/cn";

const variants = {
  default: "bg-muted text-muted-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  brand: "bg-primary/10 text-primary",
  created: "bg-success/10 text-success",
  updated: "bg-primary/10 text-primary",
  commented: "bg-secondary/30 text-secondary-foreground",
  unknown: "bg-muted text-muted-foreground",
} as const;

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
