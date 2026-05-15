import { cn } from "@/lib/cn";

const variants = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-red-700",
  brand: "bg-blue-50 text-blue-700",
  created: "bg-emerald-50 text-emerald-700",
  updated: "bg-blue-50 text-blue-700",
  commented: "bg-violet-50 text-violet-700",
  unknown: "bg-slate-100 text-slate-600",
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
