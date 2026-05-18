"use client";

import { ExternalLink, FileText } from "lucide-react";
import type { MeetingMinutes as MoMType } from "@/types/tpm";
import { EmptyState } from "@/components/ui/EmptyState";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { MomMarkdown } from "@/components/panels/MomMarkdown";
import { PanelExportActions } from "@/components/ui/PanelExportActions";
import {
  canExportMinutes,
  exportMeetingMinutesDocument,
  exportMeetingMinutesExcel,
} from "@/lib/panelExports";

const cellInput =
  "w-full rounded border border-border/50 bg-background/60 px-2 py-1.5 text-sm focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20";

type Props = {
  minutes: MoMType;
  isLoading?: boolean;
  isEmpty: boolean;
  embedded?: boolean;
  isEditing?: boolean;
  onDraftChange?: (minutes: MoMType) => void;
};

export function MeetingMinutes({
  minutes,
  isLoading = false,
  isEmpty,
  embedded = false,
  isEditing = false,
  onDraftChange,
}: Props) {
  const canExport = canExportMinutes(minutes) && !isEmpty && !isLoading;

  const content = isEmpty ? (
    <EmptyState
      icon={FileText}
      title="No meeting minutes yet"
      description="MoM content and Confluence links will appear after analysis."
    />
  ) : (
    <div className="h-full overflow-auto p-4">
      {minutes.confluenceLink ? (
        <a
          href={minutes.confluenceLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-primary to-[#A65A2C] px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <ExternalLink className="h-4 w-4" />
          Open in Confluence
          {minutes.confluenceTitle ? `: ${minutes.confluenceTitle}` : ""}
        </a>
      ) : null}

      {isEditing ? (
        <textarea
          value={minutes.rawBody ?? ""}
          onChange={(e) =>
            onDraftChange?.({ ...minutes, rawBody: e.target.value })
          }
          rows={16}
          className={`${cellInput} min-h-[280px] font-mono`}
          placeholder="Meeting summary markdown…"
        />
      ) : minutes.rawBody ? (
        <MomMarkdown content={minutes.rawBody} />
      ) : (
        <>
          {minutes.title ? (
            <h3 className="mb-3 text-base font-semibold text-foreground">
              {minutes.title}
            </h3>
          ) : null}
          {minutes.summary ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {minutes.summary}
            </p>
          ) : null}
        </>
      )}
    </div>
  );

  if (embedded) {
    return <div className="h-full overflow-hidden">{content}</div>;
  }

  return (
    <article className="glass-card relative flex min-h-[280px] flex-col overflow-hidden rounded-xl">
      <PanelHeader
        icon={FileText}
        title="Minutes of Meeting"
        subtitle="Confluence meeting summary"
        actions={
          <PanelExportActions
            disabled={!canExport}
            onExportExcel={() => exportMeetingMinutesExcel(minutes)}
            onExportDocument={() => exportMeetingMinutesDocument(minutes)}
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
