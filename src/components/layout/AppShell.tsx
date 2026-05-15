import * as React from "react";
import { LayoutDashboard, Settings } from "lucide-react";
import { cn } from "@/lib/cn";

export function AppShell({
  leftPanel,
  children,
}: {
  leftPanel: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--z-canvas)]">
      <aside className="flex w-16 shrink-0 flex-col items-center bg-[linear-gradient(180deg,var(--z-rail),var(--z-rail-2))] py-4 text-white">
        <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
          TPM
        </div>
        <nav className="flex flex-1 flex-col gap-2">
          <RailButton active icon={LayoutDashboard} label="Dashboard" />
          <RailButton icon={Settings} label="Settings" disabled />
        </nav>
        <p className="mt-auto px-1 text-center text-[10px] text-white/50">
          Lyzr
        </p>
      </aside>

      <section className="flex w-[min(100%,380px)] shrink-0 flex-col border-r border-[var(--z-border)] bg-[var(--z-panel)]">
        {leftPanel}
      </section>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden p-4 md:p-5">
        {children}
      </main>
    </div>
  );
}

function RailButton({
  icon: Icon,
  label,
  active,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
        active && "bg-white/20 text-white",
        !active && !disabled && "text-white/70 hover:bg-white/10 hover:text-white",
        disabled && "cursor-not-allowed text-white/30"
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
