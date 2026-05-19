"use client";

import { useMemo } from "react";
import { Calendar } from "lucide-react";
import type { ProjectPlanRow } from "@/types/tpm";
import { EmptyState } from "@/components/ui/EmptyState";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { MomMarkdown } from "@/components/panels/MomMarkdown";
import { PanelExportActions } from "@/components/ui/PanelExportActions";
import { SafeDisplay } from "@/components/ui/SafeDisplay";
import {
  canExportProjectPlan,
  exportProjectPlanDocument,
  exportProjectPlanExcel,
} from "@/lib/panelExports";
import {
  enrichProjectPlan,
  enrichProjectPlanRow,
  getPlanDuration,
  getPlanTaskDescription,
  getPlanTaskName,
  getPlanWbsId,
  isOverallProjectTimelineRow,
  isProjectPlanMilestone,
  PROJECT_PLAN_COLUMNS,
} from "@/lib/projectPlan";
import { cn } from "@/lib/cn";

const cellInput =
  "w-full min-w-0 rounded border border-border/50 bg-background/60 px-1.5 py-1 text-xs focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20";

type Props = {
  rows: ProjectPlanRow[];
  sectionMarkdown?: string;
  isLoading?: boolean;
  isEmpty: boolean;
  embedded?: boolean;
  isEditing?: boolean;
  onDraftChange?: (rows: ProjectPlanRow[]) => void;
};

export function ProjectPlanTable({
  rows,
  sectionMarkdown,
  isLoading = false,
  isEmpty,
  embedded = false,
  isEditing = false,
  onDraftChange,
}: Props) {
  const displayRows = useMemo(() => enrichProjectPlan(rows), [rows]);
  const milestoneCount = displayRows.filter(isProjectPlanMilestone).length;
  const taskCount = displayRows.length - milestoneCount;

  const showMarkdown = rows.length === 0 && Boolean(sectionMarkdown);
  const canExport =
    canExportProjectPlan(rows, sectionMarkdown) && !isEmpty && !isLoading;

  const updateRow = (index: number, patch: Partial<ProjectPlanRow>) => {
    if (!onDraftChange) return;
    const next = enrichProjectPlan(
      rows.map((r, i) =>
        i === index ? enrichProjectPlanRow({ ...r, ...patch }) : r
      )
    );
    onDraftChange(next);
  };

  const content = isEmpty ? (
    <EmptyState
      icon={Calendar}
      title="No project plan yet"
      description="Run analysis on a transcript to generate the Smartsheet WBS schedule."
    />
  ) : showMarkdown && sectionMarkdown ? (
    <div className="h-full overflow-auto p-3">
      <MomMarkdown content={sectionMarkdown} />
    </div>
  ) : (
    <div className="h-full overflow-auto p-2">
      {milestoneCount > 0 ? (
        <p className="mb-2 px-2 text-[11px] text-muted-foreground">
          {milestoneCount} milestone{milestoneCount === 1 ? "" : "s"}
          {taskCount > 0
            ? ` · ${taskCount} task${taskCount === 1 ? "" : "s"}`
            : ""}
        </p>
      ) : null}
      <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground">
            {PROJECT_PLAN_COLUMNS.map((col) => (
              <th
                key={col}
                className={cn(
                  "whitespace-nowrap px-2 py-2 font-medium",
                  col === "Task Name" || col === "Task Description"
                    ? "min-w-[140px]"
                    : "",
                  col === "Comments / Notes" ? "min-w-[120px]" : ""
                )}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, i) => {
            const milestone = isProjectPlanMilestone(row);
            const overall = isOverallProjectTimelineRow(row);
            const wbsId = getPlanWbsId(row);
            const taskName = getPlanTaskName(row);
            const taskDescription = getPlanTaskDescription(row);
            const duration = getPlanDuration(row);

            return (
              <tr
                key={`${wbsId || i}-${taskName}`}
                className={cn(
                  "border-b border-border/30",
                  overall
                    ? "bg-amber-500/[0.08] font-semibold"
                    : milestone
                      ? "bg-primary/[0.06] font-medium"
                      : "hover:bg-black/[0.02]"
                )}
              >
                <td className="px-2 py-2 align-top font-mono text-[11px] text-muted-foreground">
                  {isEditing ? (
                    <input
                      value={row.wbsId ?? wbsId}
                      onChange={(e) =>
                        updateRow(i, { wbsId: e.target.value })
                      }
                      className={cn(cellInput, "font-mono")}
                    />
                  ) : (
                    wbsId || "—"
                  )}
                </td>
                <td className="px-2 py-2 align-top text-foreground">
                  {isEditing ? (
                    <textarea
                      value={row.taskName ?? taskName}
                      onChange={(e) =>
                        updateRow(i, {
                          taskName: e.target.value,
                          ...(milestone
                            ? { milestoneTitle: e.target.value }
                            : {}),
                        })
                      }
                      rows={milestone ? 2 : 1}
                      className={cellInput}
                    />
                  ) : (
                    <span className={milestone ? "font-semibold" : ""}>
                      {taskName}
                    </span>
                  )}
                </td>
                <td className="max-w-[220px] px-2 py-2 align-top text-muted-foreground">
                  {isEditing ? (
                    <textarea
                      value={row.taskDesc}
                      onChange={(e) =>
                        updateRow(i, { taskDesc: e.target.value })
                      }
                      rows={2}
                      className={cellInput}
                    />
                  ) : (
                    <SafeDisplay value={taskDescription} multiline />
                  )}
                </td>
                <td className="px-2 py-2 align-top text-muted-foreground">
                  {isEditing ? (
                    <input
                      value={row.owner}
                      onChange={(e) => updateRow(i, { owner: e.target.value })}
                      className={cellInput}
                    />
                  ) : (
                    row.owner || "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-2 py-2 align-top text-muted-foreground">
                  {isEditing ? (
                    <input
                      value={row.start}
                      onChange={(e) => updateRow(i, { start: e.target.value })}
                      className={cellInput}
                    />
                  ) : (
                    row.start || "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-2 py-2 align-top text-muted-foreground">
                  {isEditing ? (
                    <input
                      value={row.end}
                      onChange={(e) => updateRow(i, { end: e.target.value })}
                      className={cellInput}
                    />
                  ) : (
                    row.end || "—"
                  )}
                </td>
                <td className="px-2 py-2 align-top text-muted-foreground">
                  {isEditing ? (
                    <input
                      value={row.duration}
                      onChange={(e) =>
                        updateRow(i, { duration: e.target.value })
                      }
                      className={cn(cellInput, "w-14")}
                    />
                  ) : (
                    duration || "—"
                  )}
                </td>
                <td className="px-2 py-2 align-top font-mono text-[11px] text-muted-foreground">
                  {isEditing ? (
                    <input
                      value={row.dependency}
                      onChange={(e) =>
                        updateRow(i, { dependency: e.target.value })
                      }
                      className={cn(cellInput, "font-mono")}
                    />
                  ) : (
                    row.dependency || "—"
                  )}
                </td>
                <td className="px-2 py-2 align-top text-muted-foreground">
                  {isEditing ? (
                    <input
                      value={row.status ?? ""}
                      onChange={(e) =>
                        updateRow(i, { status: e.target.value })
                      }
                      className={cellInput}
                    />
                  ) : (
                    row.status || "—"
                  )}
                </td>
                <td className="px-2 py-2 align-top text-muted-foreground">
                  {isEditing ? (
                    <input
                      value={row.priority ?? ""}
                      onChange={(e) =>
                        updateRow(i, { priority: e.target.value })
                      }
                      className={cellInput}
                    />
                  ) : (
                    row.priority || "—"
                  )}
                </td>
                <td className="max-w-[200px] px-2 py-2 align-top text-muted-foreground">
                  {isEditing ? (
                    <textarea
                      value={row.comments}
                      onChange={(e) =>
                        updateRow(i, { comments: e.target.value })
                      }
                      rows={2}
                      className={cellInput}
                    />
                  ) : (
                    <SafeDisplay value={row.comments} multiline />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (embedded) {
    return <div className="h-full overflow-hidden">{content}</div>;
  }

  return (
    <article className="glass-card relative flex min-h-[280px] flex-col overflow-hidden rounded-xl">
      <PanelHeader
        icon={Calendar}
        title="Project Plan"
        subtitle="Smartsheet WBS"
        count={displayRows.length || undefined}
        actions={
          <PanelExportActions
            disabled={!canExport}
            onExportExcel={() => exportProjectPlanExcel(rows, sectionMarkdown)}
            onExportDocument={() =>
              exportProjectPlanDocument(rows, sectionMarkdown)
            }
          />
        }
      />
      <div className="relative flex-1 overflow-hidden">
        {isLoading ? <LoadingOverlay /> : null}
        {content}
      </div>
    </article>
  );
}
