"use client";

import { Calendar } from "lucide-react";
import type { ProjectPlanRow } from "@/types/tpm";
import { EmptyState } from "@/components/ui/EmptyState";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { MomMarkdown } from "@/components/panels/MomMarkdown";
import { PanelExportActions } from "@/components/ui/PanelExportActions";
import {
  canExportProjectPlan,
  exportProjectPlanDocument,
  exportProjectPlanExcel,
} from "@/lib/panelExports";

const cellInput =
  "w-full min-w-0 rounded border border-border/50 bg-background/60 px-1.5 py-1 text-xs focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20";

function TimelineBar({ start, end }: { start: string; end: string }) {
  if (!start && !end) return null;
  return (
    <div className="mt-1 flex items-center gap-1">
      <div className="h-1.5 flex-1 max-w-[80px] rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/60"
          style={{ width: start && end ? "100%" : "40%" }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground">
        {start || "—"} → {end || "—"}
      </span>
    </div>
  );
}

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
  const showMarkdown = rows.length === 0 && Boolean(sectionMarkdown);
  const canExport =
    canExportProjectPlan(rows, sectionMarkdown) && !isEmpty && !isLoading;

  const updateRow = (index: number, patch: Partial<ProjectPlanRow>) => {
    if (!onDraftChange) return;
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onDraftChange(next);
  };

  const content = isEmpty ? (
    <EmptyState
      icon={Calendar}
      title="No project plan yet"
      description="Run analysis on a transcript to generate the Smartsheet schedule table."
    />
  ) : showMarkdown && sectionMarkdown ? (
    <div className="h-full overflow-auto p-3">
      <MomMarkdown content={sectionMarkdown} />
    </div>
  ) : (
    <div className="h-full overflow-auto p-2">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-border/50 text-muted-foreground">
            <th className="px-2 py-2 font-medium">Task</th>
            <th className="px-2 py-2 font-medium">Start</th>
            <th className="px-2 py-2 font-medium">End</th>
            <th className="px-2 py-2 font-medium">Duration</th>
            <th className="px-2 py-2 font-medium">Owner</th>
            <th className="px-2 py-2 font-medium">Dep.</th>
            <th className="px-2 py-2 font-medium">Comments</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/30 hover:bg-black/[0.02]">
              <td className="px-2 py-2.5">
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
                  <>
                    <span className="font-medium text-foreground">
                      {row.taskDesc}
                    </span>
                    <TimelineBar start={row.start} end={row.end} />
                  </>
                )}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">
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
              <td className="px-2 py-2.5 text-muted-foreground">
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
              <td className="px-2 py-2.5 text-muted-foreground">
                {isEditing ? (
                  <input
                    value={row.duration}
                    onChange={(e) =>
                      updateRow(i, { duration: e.target.value })
                    }
                    className={cellInput}
                  />
                ) : (
                  row.duration || "—"
                )}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">
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
              <td className="px-2 py-2.5 text-muted-foreground">
                {isEditing ? (
                  <input
                    value={row.dependency}
                    onChange={(e) =>
                      updateRow(i, { dependency: e.target.value })
                    }
                    className={cellInput}
                  />
                ) : (
                  row.dependency || "—"
                )}
              </td>
              <td className="max-w-[140px] px-2 py-2.5 text-muted-foreground">
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
                  row.comments || "—"
                )}
              </td>
            </tr>
          ))}
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
        subtitle="Smartsheet schedule"
        count={rows.length || undefined}
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
