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
          "inline-flex items-center gap-1 rounded-md border border-border/50 bg-card px-2 py-1 text-[10px] font-medium text-muted-foreground",
          "hover:border-success/30 hover:bg-success/10 hover:text-success",
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
          "inline-flex items-center gap-1 rounded-md border border-border/50 bg-card px-2 py-1 text-[10px] font-medium text-muted-foreground",
          "hover:border-primary/30 hover:bg-primary/10 hover:text-primary",
          "disabled:cursor-not-allowed disabled:opacity-40"
        )}
      >
        <FileText className="h-3 w-3" />
        Document
      </button>
    </div>
  );
}
