"use client";

import { type ComponentType } from "react";
import { AlertTriangle, ClipboardList, ListTodo, ShieldAlert, Sparkles } from "lucide-react";
import { computeRunAnalytics, sessionHasOutput } from "@/lib/analytics";
import type { MeetingMinutesPayload } from "@/types/meetingPayload";

function AnalyticsCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
      <div className="mb-1 flex items-center gap-2">
        <div className="rounded-md bg-primary/10 p-1">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

export function ProjectAnalyticsSection({ payload }: { payload: MeetingMinutesPayload | null }) {
  if (!payload || !sessionHasOutput(payload)) return null;

  const stats = computeRunAnalytics(payload);
  const planValue =
    stats.planTasksTotal > 0
      ? `${stats.planTasksDone}/${stats.planTasksTotal}`
      : "0";
  const planHint =
    stats.planTasksTotal > 0
      ? stats.planTasksBlocked > 0
        ? `${stats.planTasksBlocked} blocked · ${stats.planTasksTotal - stats.planTasksDone} remaining`
        : `${stats.planTasksTotal - stats.planTasksDone} tasks not yet done`
      : "No plan tasks in this run";

  const issuesValue = stats.totalIssues > 0 ? String(stats.openIssues) : "0";
  const issuesHint =
    stats.totalIssues > 0
      ? `${stats.totalIssues} tracked · ${stats.bugIssues} bug${stats.bugIssues === 1 ? "" : "s"}`
      : "No issues in this run";

  const raidValue = stats.totalRaidItems > 0 ? String(stats.openRaidItems) : "0";
  const raidHint =
    stats.totalRaidItems > 0
      ? `${stats.totalRaidItems} RAID entries · ${stats.openRaidItems} need attention`
      : "No RAID items in this run";

  const followUpsValue = String(stats.openActionItems);
  const followUpsHint =
    stats.totalActionItems > 0 || stats.pendingCtas > 0
      ? [
          stats.totalActionItems > 0
            ? `${stats.openActionItems} of ${stats.totalActionItems} MoM actions open`
            : null,
          stats.pendingCtas > 0 ? `${stats.pendingCtas} pending recommended actions` : null,
          stats.keyDecisions > 0 ? `${stats.keyDecisions} key decisions` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : "No follow-ups in this run";

  return (
    <section className="glass-card rounded-xl p-3">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Project analytics</p>
        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
          This run
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard label="Plan progress" value={planValue} hint={planHint} icon={ListTodo} />
        <AnalyticsCard label="Open issues" value={issuesValue} hint={issuesHint} icon={AlertTriangle} />
        <AnalyticsCard label="RAID exposure" value={raidValue} hint={raidHint} icon={ShieldAlert} />
        <AnalyticsCard label="Follow-ups" value={followUpsValue} hint={followUpsHint} icon={ClipboardList} />
      </div>
    </section>
  );
}
