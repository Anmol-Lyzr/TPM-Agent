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
            ? "bg-warning/10 text-warning"
            : isEditing
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
        )}
      >
        {statusLabel}
      </span>
      {!isEditing ? (
        <button
          type="button"
          disabled={!canEdit}
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-40"
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
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/50"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
