"use client";

import { ListTodo } from "lucide-react";
import type { TaskRow } from "@/types/tpm";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { MomMarkdown } from "@/components/panels/MomMarkdown";
import { PanelExportActions } from "@/components/ui/PanelExportActions";
import {
  canExportTasks,
  exportTaskTrackerDocument,
  exportTaskTrackerExcel,
} from "@/lib/panelExports";

const cellInput =
  "w-full min-w-0 rounded border border-slate-200 bg-white px-1.5 py-1 text-xs focus:border-[var(--z-brand)] focus:outline-none";

type Props = {
  tasks: TaskRow[];
  sectionMarkdown?: string;
  isLoading?: boolean;
  isEmpty: boolean;
  embedded?: boolean;
  isEditing?: boolean;
  onDraftChange?: (tasks: TaskRow[]) => void;
};

export function TaskTracker({
  tasks,
  sectionMarkdown,
  isLoading = false,
  isEmpty,
  embedded = false,
  isEditing = false,
  onDraftChange,
}: Props) {
  const showMarkdown = tasks.length === 0 && Boolean(sectionMarkdown);
  const canExport =
    canExportTasks(tasks, sectionMarkdown) && !isEmpty && !isLoading;

  const updateTask = (index: number, patch: Partial<TaskRow>) => {
    if (!onDraftChange) return;
    onDraftChange(tasks.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const content = isEmpty ? (
    <EmptyState
      icon={ListTodo}
      title="No tasks yet"
      description="Scheduled work items from the project plan will appear here with owners and dates."
    />
  ) : showMarkdown && sectionMarkdown ? (
    <div className="h-full overflow-auto p-3">
      <MomMarkdown content={sectionMarkdown} />
    </div>
  ) : (
    <ul className="h-full space-y-2 overflow-auto p-3">
      {tasks.map((task, i) => (
        <li
          key={`${task.taskNumber}-${i}`}
          className="rounded-lg border border-[var(--z-border)] bg-[var(--z-panel-2)] p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {task.taskNumber > 0 ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-teal-100 text-[10px] font-bold text-teal-800">
                    {task.taskNumber}
                  </span>
                ) : null}
                {isEditing ? (
                  <input
                    value={task.description}
                    onChange={(e) =>
                      updateTask(i, { description: e.target.value })
                    }
                    className={cellInput}
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-800">
                    {task.description}
                  </p>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                {isEditing ? (
                  <>
                    <label className="flex items-center gap-1">
                      Owner
                      <input
                        value={task.owner}
                        onChange={(e) =>
                          updateTask(i, { owner: e.target.value })
                        }
                        className={cellInput}
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      Start
                      <input
                        value={task.start}
                        onChange={(e) =>
                          updateTask(i, { start: e.target.value })
                        }
                        className={cellInput}
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      End
                      <input
                        value={task.end}
                        onChange={(e) => updateTask(i, { end: e.target.value })}
                        className={cellInput}
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      Depends
                      <input
                        value={task.dependency}
                        onChange={(e) =>
                          updateTask(i, { dependency: e.target.value })
                        }
                        className={cellInput}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    {task.owner ? <span>Owner: {task.owner}</span> : null}
                    {(task.start || task.end) && (
                      <span>
                        {task.start || "—"} → {task.end || "—"}
                      </span>
                    )}
                    {task.dependency ? (
                      <span>Depends on: #{task.dependency}</span>
                    ) : null}
                  </>
                )}
              </div>
            </div>
            {isEditing ? (
              <select
                value={task.status}
                onChange={(e) =>
                  updateTask(i, {
                    status: e.target.value as TaskRow["status"],
                  })
                }
                className={cellInput}
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Unscheduled">Unscheduled</option>
              </select>
            ) : (
              <Badge
                variant={task.status === "Scheduled" ? "success" : "default"}
              >
                {task.status}
              </Badge>
            )}
          </div>
        </li>
      ))}
    </ul>
  );

  if (embedded) {
    return <div className="h-full overflow-hidden">{content}</div>;
  }

  return (
    <article className="panel-card relative flex min-h-[280px] flex-col overflow-hidden">
      <PanelHeader
        icon={ListTodo}
        title="Task Tracker"
        subtitle="Work items & schedule"
        count={tasks.length || undefined}
        actions={
          <PanelExportActions
            disabled={!canExport}
            onExportExcel={() => exportTaskTrackerExcel(tasks, sectionMarkdown)}
            onExportDocument={() =>
              exportTaskTrackerDocument(tasks, sectionMarkdown)
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
