"use client";

import { type ComponentType } from "react";
import Link from "next/link";
import { ArrowRight, Bug, Calendar, FileText, ListTodo, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useStoredSession } from "@/hooks/useStoredSession";

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
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
    </motion.div>
  );
}

export function DashboardHome() {
  const { sessionId, parsed, ready } = useStoredSession();

  const hasSession = Boolean(sessionId);
  const hasData =
    parsed.projectPlan.length > 0 ||
    parsed.issues.length > 0 ||
    parsed.tasks.length > 0 ||
    Boolean(parsed.meetingMinutes.rawBody);

  const scheduledTasks = parsed.tasks.filter(
    (t) => t.status === "Scheduled"
  ).length;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Sparkles className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Meeting intelligence — plans, issues, tasks, and minutes from MS Teams transcripts.
        </p>
      </div>

      {/* Stat cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
      >
        <StatCard
          label="Project plan"
          value={ready ? parsed.projectPlan.length : "—"}
          hint="Smartsheet rows"
          icon={Calendar}
        />
        <StatCard
          label="Jira issues"
          value={ready ? parsed.issues.length : "—"}
          hint="Tracked issues"
          icon={Bug}
        />
        <StatCard
          label="Tasks"
          value={ready ? parsed.tasks.length : "—"}
          hint={`${scheduledTasks} scheduled`}
          icon={ListTodo}
        />
        <StatCard
          label="Meeting minutes"
          value={
            ready
              ? parsed.meetingMinutes.rawBody
                ? "Ready"
                : parsed.meetingMinutes.title
                  ? "Partial"
                  : "—"
              : "—"
          }
          hint="Confluence summary"
          icon={FileText}
        />
      </motion.div>

      {/* Session status + Quick start */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 lg:grid-cols-3"
      >
        <motion.div variants={itemVariants} className="glass-card rounded-xl overflow-hidden lg:col-span-2">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-black/[0.05]">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Session status</h2>
          </div>
          <div className="p-5">
            <p className="text-sm text-muted-foreground mb-4">
              {hasSession ? (
                <>
                  Active workspace session
                  {hasData
                    ? " with analyzed meeting output."
                    : " — open the workspace to analyze a transcript."}
                </>
              ) : (
                "No active session. Start in the workspace with a meeting transcript."
              )}
            </p>
            {hasSession && sessionId ? (
              <p className="mb-4 truncate rounded-lg bg-black/[0.04] px-3 py-2 font-mono text-[11px] text-muted-foreground">
                {sessionId}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/workspace"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-primary to-[#A65A2C] text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
              >
                <Sparkles className="h-4 w-4" />
                Open workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              {hasData ? (
                <Link
                  href="/workspace"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/[0.04] text-sm font-medium text-foreground hover:bg-black/[0.07] transition-colors"
                >
                  Continue editing
                </Link>
              ) : null}
              <Link
                href={
                  sessionId
                    ? `/session?id=${encodeURIComponent(sessionId)}`
                    : "/session"
                }
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
            <h2 className="text-sm font-semibold text-foreground">Quick start</h2>
          </div>
          <div className="p-5">
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
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
