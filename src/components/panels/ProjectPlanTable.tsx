"use client";

import { Fragment, useMemo } from "react";
import { Calendar } from "lucide-react";
import type { ProjectPlanPayload, ProjectPlanMilestone, ProjectPlanTask } from "@/types/meetingPayload";
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
  editable?: boolean;
  ownerOptions?: string[];
  onChange?: (next: ProjectPlanPayload) => void;
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
  editable = false,
  ownerOptions = [],
  onChange,
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

  const updateTask = (
    milestoneIdx: number,
    taskIdx: number,
    key: keyof ProjectPlanTask,
    value: string
  ) => {
    if (!plan || !onChange) return;
    const next: ProjectPlanPayload = {
      ...plan,
      milestones: plan.milestones.map((m, mi) =>
        mi !== milestoneIdx
          ? m
          : {
              ...m,
              tasks: m.tasks.map((t, ti) => {
                if (ti !== taskIdx) return t;
                if (key === "duration_days") return { ...t, duration_days: Number(value) || 0 };
                if (key === "dependency_ids") return { ...t, dependency_ids: value.split(",").map((v) => v.trim()).filter(Boolean) };
                return { ...t, [key]: value };
              }),
            }
      ),
    };
    onChange(next);
  };

  const updateMilestone = (
    milestoneIdx: number,
    key: keyof ProjectPlanMilestone,
    value: string
  ) => {
    if (!plan || !onChange) return;
    const next: ProjectPlanPayload = {
      ...plan,
      milestones: plan.milestones.map((m, mi) => {
        if (mi !== milestoneIdx) return m;
        if (key === "milestone_timeline_duration") return { ...m, milestone_timeline_duration: Number(value) || 0 };
        if (key === "dependencies") return { ...m, dependencies: value.split(",").map((v) => v.trim()).filter(Boolean) };
        return { ...m, [key]: value };
      }),
    };
    onChange(next);
  };

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
          {milestones.map((milestone, mi) => {
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
                    {editable ? (
                      <input
                        value={milestone.title}
                        onChange={(e) => updateMilestone(mi, "title", e.target.value)}
                        className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs"
                      />
                    ) : (
                      <span className="font-semibold text-foreground">{milestone.title || "—"}</span>
                    )}
                  </td>
                  <td className="max-w-[200px] px-2 py-2.5 align-middle text-muted-foreground">
                    —
                  </td>
                  <td className="px-2 py-2.5 align-middle text-muted-foreground">
                    {editable ? (
                      <select
                        value={milestone.owner}
                        onChange={(e) => updateMilestone(mi, "owner", e.target.value)}
                        className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs"
                      >
                        <option value="">Select owner</option>
                        {ownerOptions.map((owner) => (
                          <option key={owner} value={owner}>{owner}</option>
                        ))}
                      </select>
                    ) : (
                      milestone.owner || "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 align-middle font-medium text-foreground/80">
                    {editable ? (
                      <input
                        type="date"
                        value={milestone.start_date}
                        onChange={(e) => updateMilestone(mi, "start_date", e.target.value)}
                        className="rounded border border-border/40 bg-background/60 px-2 py-1 text-xs"
                      />
                    ) : (
                      agg?.start || milestone.start_date || "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 align-middle font-medium text-foreground/80">
                    {editable ? (
                      <input
                        type="date"
                        value={milestone.end_date}
                        onChange={(e) => updateMilestone(mi, "end_date", e.target.value)}
                        className="rounded border border-border/40 bg-background/60 px-2 py-1 text-xs"
                      />
                    ) : (
                      agg?.end || milestone.end_date || "—"
                    )}
                  </td>
                  <td className="px-2 py-2.5 align-middle font-medium text-foreground/80">
                    {days > 0 ? days : "—"}
                  </td>
                  <td className="px-2 py-2.5 align-middle font-mono text-[11px] text-muted-foreground">
                    {editable ? (
                      <input
                        value={milestone.dependencies?.join(", ") ?? ""}
                        onChange={(e) => updateMilestone(mi, "dependencies", e.target.value)}
                        className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs"
                      />
                    ) : (
                      milestone.dependencies?.join(", ") || "—"
                    )}
                  </td>
                  <td className="px-2 py-2.5 align-middle">
                    {editable ? (
                      <select
                        value={milestone.status}
                        onChange={(e) => updateMilestone(mi, "status", e.target.value)}
                        className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs"
                      >
                        <option>Not Started</option>
                        <option>In Progress</option>
                        <option>Completed</option>
                      </select>
                    ) : (
                      milestone.status || "—"
                    )}
                  </td>
                  <td className="px-2 py-2.5 align-middle text-muted-foreground">—</td>
                </tr>
                {/* Task rows */}
                {(milestone.tasks ?? []).map((task, ti) => (
                  <tr key={`t-${task.task_id}`} className="border-b border-border/20 hover:bg-black/[0.02]">
                    <td className="px-2 py-2 pl-8 align-top font-mono text-[11px] text-muted-foreground">{task.task_id || "—"}</td>
                    <td className="px-2 py-2 align-top text-foreground">
                      {editable ? (
                        <input value={task.title} onChange={(e) => updateTask(mi, ti, "title", e.target.value)} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" />
                      ) : task.title || "—"}
                    </td>
                    <td className="max-w-[200px] px-2 py-2 align-top text-muted-foreground text-xs">
                      {editable ? (
                        <input value={task.description} onChange={(e) => updateTask(mi, ti, "description", e.target.value)} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" />
                      ) : task.description || "—"}
                    </td>
                    <td className="px-2 py-2 align-top text-muted-foreground">
                      {editable ? (
                        <select value={task.owner} onChange={(e) => updateTask(mi, ti, "owner", e.target.value)} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs">
                          <option value="">Select owner</option>
                          {ownerOptions.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
                        </select>
                      ) : task.owner || "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 align-top text-muted-foreground">{editable ? <input type="date" value={task.start_date} onChange={(e) => updateTask(mi, ti, "start_date", e.target.value)} className="rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" /> : task.start_date || "—"}</td>
                    <td className="whitespace-nowrap px-2 py-2 align-top text-muted-foreground">{editable ? <input type="date" value={task.end_date} onChange={(e) => updateTask(mi, ti, "end_date", e.target.value)} className="rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" /> : task.end_date || "—"}</td>
                    <td className="px-2 py-2 align-top text-muted-foreground">{editable ? <input type="number" value={task.duration_days} onChange={(e) => updateTask(mi, ti, "duration_days", e.target.value)} className="w-20 rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" /> : task.duration_days ?? "—"}</td>
                    <td className="px-2 py-2 align-top font-mono text-[11px] text-muted-foreground">{editable ? <input value={task.dependency_ids?.join(", ") ?? ""} onChange={(e) => updateTask(mi, ti, "dependency_ids", e.target.value)} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" /> : task.dependency_ids?.join(", ") || "—"}</td>
                    <td className="px-2 py-2 align-top">
                      {editable ? (
                        <select value={task.status} onChange={(e) => updateTask(mi, ti, "status", e.target.value)} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs">
                          <option>To Do</option><option>In Progress</option><option>Done</option><option>Blocked</option>
                        </select>
                      ) : task.status || "—"}
                    </td>
                    <td className="max-w-[160px] px-2 py-2 align-top text-muted-foreground">{editable ? <input value={task.comments} onChange={(e) => updateTask(mi, ti, "comments", e.target.value)} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" /> : task.comments || "—"}</td>
                  </tr>
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
