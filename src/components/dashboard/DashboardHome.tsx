"use client";

import { type ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bug,
  Calendar,
  FileText,
  ListTodo,
  Sparkles,
} from "lucide-react";
import { useStoredSession } from "@/hooks/useStoredSession";

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <article className="panel-card flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-2xl font-semibold tabular-nums text-slate-900">
          {value}
        </p>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
      </div>
    </article>
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
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto">
      <header className="shrink-0">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--z-brand)]">
          TPM Agent
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Dashboard
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Overview of your meeting intelligence — plans, Jira issues, tasks, and
          minutes from MS Teams transcripts.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Project plan"
          value={ready ? parsed.projectPlan.length : "—"}
          hint="Smartsheet schedule rows"
          icon={Calendar}
          accent="bg-teal-50 text-teal-700"
        />
        <StatCard
          label="Jira issues"
          value={ready ? parsed.issues.length : "—"}
          hint="Tracked in issue list"
          icon={Bug}
          accent="bg-blue-50 text-blue-700"
        />
        <StatCard
          label="Tasks"
          value={ready ? parsed.tasks.length : "—"}
          hint={`${scheduledTasks} scheduled`}
          icon={ListTodo}
          accent="bg-violet-50 text-violet-700"
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
          accent="bg-amber-50 text-amber-700"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="panel-card lg:col-span-2 p-6">
          <h2 className="text-sm font-semibold text-slate-900">
            Session status
          </h2>
          <p className="mt-2 text-sm text-slate-600">
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
            <p className="mt-3 truncate rounded-md bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-500">
              {sessionId}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/workspace"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--z-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--z-brand-2)]"
            >
              <Sparkles className="h-4 w-4" />
              Open workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
            {hasData ? (
              <Link
                href="/workspace"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--z-border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--z-border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Browse saved sessions
            </Link>
          </div>
        </article>

        <article className="panel-card p-6">
          <h2 className="text-sm font-semibold text-slate-900">Quick start</h2>
          <ol className="mt-3 space-y-3 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                1
              </span>
              Open the workspace and paste a transcript
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                2
              </span>
              Run Analyze Meeting to generate outputs
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                3
              </span>
              Edit, export, or refine with AI per tab
            </li>
          </ol>
        </article>
      </section>

    </div>
  );
}
