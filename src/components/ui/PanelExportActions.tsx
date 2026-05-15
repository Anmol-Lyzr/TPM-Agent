"use client";

import { FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/cn";

export function PanelExportActions({
  onExportExcel,
  onExportDocument,
  disabled,
  className,
}: {
  onExportExcel: () => void;
  onExportDocument: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={onExportExcel}
        title="Export to Excel"
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-[var(--z-border)] bg-white px-2 py-1 text-[10px] font-medium text-slate-600",
          "hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800",
          "disabled:cursor-not-allowed disabled:opacity-40"
        )}
      >
        <FileSpreadsheet className="h-3 w-3" />
        Excel
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onExportDocument}
        title="Export as Word document"
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-[var(--z-border)] bg-white px-2 py-1 text-[10px] font-medium text-slate-600",
          "hover:border-blue-200 hover:bg-blue-50 hover:text-[var(--z-brand)]",
          "disabled:cursor-not-allowed disabled:opacity-40"
        )}
      >
        <FileText className="h-3 w-3" />
        Document
      </button>
    </div>
  );
}
