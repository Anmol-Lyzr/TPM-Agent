"use client";

import { Fragment, useMemo } from "react";
import { Calendar } from "lucide-react";
import type { ProjectPlanPayload, ProjectPlanMilestone, ProjectPlanTask } from "@/types/meetingPayload";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { cn } from "@/lib/cn";

type Props = {
  plan: ProjectPlanPayload | null;
  projectTitle?: string;
  isLoading?: boolean;
  isEmpty: boolean;
  embedded?: boolean;
};

interface MilestoneAggregates {
  start: string;
  end: string;
  totalDuration: number;
  status: string;
}

function computeMilestoneAggregates(milestone: ProjectPlanMilestone): MilestoneAggregates {
  const tasks = milestone.tasks ?? [];
  if (tasks.length === 0) {
    return {
      start: milestone.start_date,
      end: milestone.end_date,
      totalDuration: milestone.milestone_timeline_duration ?? 0,
      status: milestone.status,
    };
  }

  let minDate: Date | null = null;
  let minLabel = milestone.start_date;
  let maxDate: Date | null = null;
  let maxLabel = milestone.end_date;
  let totalDuration = 0;

  for (const task of tasks) {
    if (task.start_date) {
      const d = new Date(task.start_date);
      if (!isNaN(d.getTime()) && (!minDate || d < minDate)) {
        minDate = d;
        minLabel = task.start_date;
      }
    }
    if (task.end_date) {
      const d = new Date(task.end_date);
      if (!isNaN(d.getTime()) && (!maxDate || d > maxDate)) {
        maxDate = d;
        maxLabel = task.end_date;
      }
    }
    totalDuration += task.duration_days ?? 0;
  }

  const statuses = tasks.map(t => (t.status ?? "").toLowerCase());
  let derivedStatus: string = milestone.status;
  if (statuses.every(s => s === "done")) {
    derivedStatus = "Completed";
  } else if (statuses.some(s => s === "blocked")) {
    derivedStatus = "Blocked";
  } else if (statuses.some(s => s === "in progress")) {
    derivedStatus = "In Progress";
  } else if (statuses.every(s => s === "to do" || s === "")) {
    derivedStatus = "Not Started";
  }

  return {
    start: minLabel,
    end: maxLabel,
    totalDuration,
    status: derivedStatus,
  };
}

function statusBadgeVariant(status: string): "success" | "warning" | "danger" | "default" {
  const s = status.toLowerCase();
  if (s === "completed" || s === "done") return "success";
  if (s === "in progress") return "warning";
  if (s === "blocked") return "danger";
  return "default";
}

function TaskRow({ task }: { task: ProjectPlanTask }) {
  return (
    <tr className="border-b border-border/20 hover:bg-black/[0.02]">
      <td className="px-2 py-2 pl-8 align-top font-mono text-[11px] text-muted-foreground">
        {task.task_id || "—"}
      </td>
      <td className="px-2 py-2 align-top text-foreground">
        <span className="pl-1">{task.title || "—"}</span>
      </td>
      <td className="max-w-[200px] px-2 py-2 align-top text-muted-foreground text-xs">
        {task.description || "—"}
      </td>
      <td className="px-2 py-2 align-top text-muted-foreground">{task.owner || "—"}</td>
      <td className="whitespace-nowrap px-2 py-2 align-top text-muted-foreground">{task.start_date || "—"}</td>
      <td className="whitespace-nowrap px-2 py-2 align-top text-muted-foreground">{task.end_date || "—"}</td>
      <td className="px-2 py-2 align-top text-muted-foreground">{task.duration_days ?? "—"}</td>
      <td className="px-2 py-2 align-top font-mono text-[11px] text-muted-foreground">
        {task.dependency_ids?.join(", ") || "—"}
      </td>
      <td className="px-2 py-2 align-top">
        {task.status ? (
          <Badge variant={statusBadgeVariant(task.status)}>{task.status}</Badge>
        ) : (
          "—"
        )}
      </td>
      <td className="max-w-[160px] px-2 py-2 align-top text-muted-foreground">
        {task.comments || "—"}
      </td>
    </tr>
  );
}

function milestoneDuration(milestone: ProjectPlanMilestone, agg: MilestoneAggregates | undefined): number {
  if (agg && agg.totalDuration > 0) return agg.totalDuration;
  return milestone.milestone_timeline_duration ?? 0;
}

export function ProjectPlanTable({
  plan,
  projectTitle,
  isLoading = false,
  isEmpty,
  embedded = false,
}: Props) {
  const milestones = plan?.milestones ?? [];

  const aggregates = useMemo(() => {
    const map = new Map<string, MilestoneAggregates>();
    for (const m of milestones) {
      map.set(m.milestone_id, computeMilestoneAggregates(m));
    }
    return map;
  }, [milestones]);

  const projectTotalDuration = useMemo(() => {
    return milestones.reduce((sum, m) => {
      const agg = aggregates.get(m.milestone_id);
      return sum + milestoneDuration(m, agg);
    }, 0);
  }, [milestones, aggregates]);

  const milestoneCount = milestones.length;
  const taskCount = milestones.reduce((n, m) => n + (m.tasks?.length ?? 0), 0);

  const content = isEmpty || milestones.length === 0 ? (
    <EmptyState
      icon={Calendar}
      title="No project plan yet"
      description="Run analysis on a transcript to generate the project plan."
    />
  ) : (
    <div className="h-full overflow-auto p-2">
      {milestoneCount > 0 ? (
        <p className="mb-2 px-2 text-[11px] text-muted-foreground">
          {milestoneCount} milestone{milestoneCount === 1 ? "" : "s"}
          {taskCount > 0 ? ` · ${taskCount} task${taskCount === 1 ? "" : "s"}` : ""}
        </p>
      ) : null}
      <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground">
            <th className="whitespace-nowrap px-2 py-2 font-medium">ID</th>
            <th className="whitespace-nowrap min-w-[140px] px-2 py-2 font-medium">Task Name</th>
            <th className="whitespace-nowrap min-w-[140px] px-2 py-2 font-medium">Description</th>
            <th className="whitespace-nowrap px-2 py-2 font-medium">Owner</th>
            <th className="whitespace-nowrap px-2 py-2 font-medium">Start Date</th>
            <th className="whitespace-nowrap px-2 py-2 font-medium">End Date</th>
            <th className="whitespace-nowrap px-2 py-2 font-medium">Duration (Days)</th>
            <th className="whitespace-nowrap px-2 py-2 font-medium">Dependencies</th>
            <th className="whitespace-nowrap px-2 py-2 font-medium">Status</th>
            <th className="whitespace-nowrap min-w-[120px] px-2 py-2 font-medium">Comments</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border bg-muted text-foreground">
            <td className="px-2 py-3 align-middle font-mono text-[11px] font-bold text-foreground">
              —
            </td>
            <td className="px-2 py-3 align-middle">
              <span className="font-bold text-foreground">
                {projectTitle?.trim() || "Project"}
              </span>
            </td>
            <td className="max-w-[200px] px-2 py-3 align-middle text-foreground/90">—</td>
            <td className="px-2 py-3 align-middle text-foreground/90">—</td>
            <td className="whitespace-nowrap px-2 py-3 align-middle text-foreground/90">—</td>
            <td className="whitespace-nowrap px-2 py-3 align-middle text-foreground/90">—</td>
            <td className="px-2 py-3 align-middle font-bold text-foreground">
              {projectTotalDuration > 0 ? projectTotalDuration : "—"}
            </td>
            <td className="px-2 py-3 align-middle font-mono text-[11px] text-foreground/90">—</td>
            <td className="px-2 py-3 align-middle text-foreground/90">—</td>
            <td className="px-2 py-3 align-middle text-foreground/90">—</td>
          </tr>
          {milestones.map(milestone => {
            const agg = aggregates.get(milestone.milestone_id);
            const days = milestoneDuration(milestone, agg);
            return (
              <Fragment key={milestone.milestone_id}>
                {/* Milestone header row */}
                <tr
                  key={`m-${milestone.milestone_id}`}
                  className="border-b border-border/50 bg-muted/50"
                >
                  <td className="px-2 py-2.5 align-middle font-mono text-[11px] font-semibold text-primary/70">
                    {milestone.milestone_id || "—"}
                  </td>
                  <td className="px-2 py-2.5 align-middle">
                    <span className="font-semibold text-foreground">
                      {milestone.title || "—"}
                    </span>
                  </td>
                  <td className="max-w-[200px] px-2 py-2.5 align-middle text-muted-foreground">
                    —
                  </td>
                  <td className="px-2 py-2.5 align-middle text-muted-foreground">
                    {milestone.owner || "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 align-middle font-medium text-foreground/80">
                    {agg?.start || milestone.start_date || "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 align-middle font-medium text-foreground/80">
                    {agg?.end || milestone.end_date || "—"}
                  </td>
                  <td className="px-2 py-2.5 align-middle font-medium text-foreground/80">
                    {days > 0 ? days : "—"}
                  </td>
                  <td className="px-2 py-2.5 align-middle font-mono text-[11px] text-muted-foreground">
                    {milestone.dependencies?.join(", ") || "—"}
                  </td>
                  <td className="px-2 py-2.5 align-middle">
                    {agg?.status ? (
                      <Badge variant={statusBadgeVariant(agg.status)}>{agg.status}</Badge>
                    ) : milestone.status ? (
                      <Badge variant={statusBadgeVariant(milestone.status)}>{milestone.status}</Badge>
                    ) : "—"}
                  </td>
                  <td className="px-2 py-2.5 align-middle text-muted-foreground">—</td>
                </tr>
                {/* Task rows */}
                {(milestone.tasks ?? []).map(task => (
                  <TaskRow key={`t-${task.task_id}`} task={task} />
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (embedded) {
    return <div className={cn("h-full overflow-hidden")}>{content}</div>;
  }

  return (
    <article className="glass-card relative flex min-h-[280px] flex-col overflow-hidden rounded-xl">
      <PanelHeader
        icon={Calendar}
        title="Project Plan"
        subtitle="Milestones & tasks"
        count={taskCount || undefined}
      />
      <div className="relative flex-1 overflow-hidden">
        {isLoading ? <LoadingOverlay /> : null}
        {content}
      </div>
    </article>
  );
}
