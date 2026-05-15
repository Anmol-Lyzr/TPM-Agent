"use client";

import { Pencil, Save, X } from "lucide-react";
import { cn } from "@/lib/cn";

export function EditToolbar({
  isEditing,
  isDirty,
  canEdit,
  onEdit,
  onSave,
  onCancel,
}: {
  isEditing: boolean;
  isDirty: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const statusLabel = !canEdit
    ? "No data"
    : isEditing
      ? isDirty
        ? "Unsaved changes"
        : "Editing"
      : "Viewing";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
          isDirty
            ? "bg-amber-50 text-amber-800"
            : isEditing
              ? "bg-blue-50 text-blue-700"
              : "bg-slate-100 text-slate-600"
        )}
      >
        {statusLabel}
      </span>
      {!isEditing ? (
        <button
          type="button"
          disabled={!canEdit}
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--z-border)] bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      ) : (
        <>
          <button
            type="button"
            disabled={!isDirty}
            onClick={onSave}
            className="inline-flex items-center gap-1 rounded-md bg-[var(--z-brand)] px-2.5 py-1 text-xs font-medium text-white hover:bg-[var(--z-brand-2)] disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--z-border)] bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
