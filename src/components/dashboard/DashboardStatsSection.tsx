"use client";

import { type ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bug,
  FolderKanban,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

function StatCard({
  label,
  value,
  hint,
  ctaLabel,
  href,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  ctaLabel: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <motion.div variants={itemVariants} className="glass-card rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <motion.div className="p-1.5 rounded-lg bg-primary/10">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </motion.div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
      <Link
        href={href}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
      >
        {ctaLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </motion.div>
  );
}

/** Meeting analytics overview shown below the dashboard chat hero. */
export function DashboardStatsSection() {
  const { analytics, ready, error } = useDashboardAnalytics();
  const display = (n: number) => (ready ? n : "—");

  return (
    <div className="pt-4 border-t border-black/6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Project analytics</h2>
        <span className="text-[9px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
          {ready ? analytics.totalSessions : "—"} sessions
        </span>
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6"
      >
        <StatCard
          label="Overall projects"
          value={display(analytics.overallProjects)}
          hint="Meetings with analyzed output"
          ctaLabel="Open project list"
          href="/session"
          icon={FolderKanban}
        />
        <StatCard
          label="Total bugs"
          value={display(analytics.totalBugs)}
          hint="Bug-type Jira issues across all meetings"
          ctaLabel="Review bug issues"
          href="/session?focus=bugs"
          icon={Bug}
        />
        <StatCard
          label="Weekly connects"
          value={display(analytics.totalSessions)}
          hint="Saved meeting sessions available for follow-up"
          ctaLabel="Open all connects"
          href="/session"
          icon={CalendarDays}
        />
      </motion.div>
    </div>
  );
}
