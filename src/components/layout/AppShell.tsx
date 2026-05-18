"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

export type AppNavId = "dashboard" | "workspace" | "session";

export function AppShell({
  leftPanel,
  children,
}: {
  leftPanel?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const activeNav: AppNavId = pathname.startsWith("/workspace")
    ? "workspace"
    : pathname.startsWith("/session")
      ? "session"
      : "dashboard";

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--z-canvas)]">
      <aside className="flex w-16 shrink-0 flex-col items-center bg-[linear-gradient(180deg,var(--z-rail),var(--z-rail-2))] py-4 text-white">
        <Link
          href="/"
          className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-sm font-bold transition-colors hover:bg-white/15"
          title="TPM Agent home"
        >
          TPM
        </Link>
        <nav className="flex flex-1 flex-col gap-2">
          <RailLink
            href="/"
            active={activeNav === "dashboard"}
            icon={LayoutDashboard}
            label="Dashboard"
          />
          <RailLink
            href="/workspace"
            active={activeNav === "workspace"}
            icon={Sparkles}
            label="Workspace"
          />
          <RailLink
            href="/session"
            active={activeNav === "session"}
            icon={Search}
            label="View session"
          />
          <RailButton icon={Settings} label="Settings" disabled />
        </nav>
        <p className="mt-auto px-1 text-center text-[10px] text-white/50">
          Lyzr
        </p>
      </aside>

      {leftPanel ? (
        <section className="flex w-[min(100%,380px)] shrink-0 flex-col border-r border-[var(--z-border)] bg-[var(--z-panel)]">
          {leftPanel}
        </section>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}

function RailLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
        active && "bg-white/20 text-white",
        !active && "text-white/70 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon className="h-5 w-5" />
    </Link>
  );
}

function RailButton({
  icon: Icon,
  label,
  disabled,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
        disabled && "cursor-not-allowed text-white/30"
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
