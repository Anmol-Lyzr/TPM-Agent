"use client";

import { type ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bug,
  CheckCircle2,
  FolderKanban,
  ListTodo,
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
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
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
    </motion.div>
  );
}

/** Analytics, quick start, and session overview — shown below the dashboard chat hero. */
export function DashboardStatsSection() {
  const { analytics, ready, error } = useDashboardAnalytics();
  const display = (n: number) => (ready ? n : "—");

  return (
    <div className="pt-4 border-t border-black/[0.06]">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Meeting analytics</h2>
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
          icon={FolderKanban}
        />
        <StatCard
          label="Total bugs"
          value={display(analytics.totalBugs)}
          hint="Bug-type Jira issues (deduped by key)"
          icon={Bug}
        />
        <StatCard
          label="Completed projects"
          value={display(analytics.completedProjects)}
          hint="Sessions with plan, issues, RAID log, or MoM"
          icon={CheckCircle2}
        />
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 lg:grid-cols-3"
      >
        <motion.div variants={itemVariants} className="glass-card rounded-xl overflow-hidden lg:col-span-2">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-black/[0.05]">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Across all sessions</h3>
          </div>
          <div className="p-5">
            <p className="text-sm text-muted-foreground mb-4">
              {ready ? (
                <>
                  {analytics.totalSessions === 0
                    ? "No sessions yet. Start in the workspace with a meeting transcript."
                    : `${analytics.totalSessions} workspace session${analytics.totalSessions === 1 ? "" : "s"} stored — ${analytics.overallProjects} with analyzed meeting output.`}
                </>
              ) : (
                "Loading session analytics…"
              )}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/workspace"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-primary to-[#A65A2C] text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
              >
                <Sparkles className="h-4 w-4" />
                Open workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/session"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/[0.04] text-sm font-medium text-foreground hover:bg-black/[0.07] transition-colors"
              >
                Browse sessions
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-card rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-black/[0.05]">
            <ListTodo className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Quick start</h3>
          </div>
          <motion.div className="p-5">
            <ol className="space-y-3">
              {[
                "Open the workspace and paste a transcript",
                "Run Analyze Meeting to generate outputs",
                "Edit, export, or refine with AI per tab",
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5 items-start">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-sm text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
