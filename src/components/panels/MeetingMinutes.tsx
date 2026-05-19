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

function hasStructuredContent(minutes: MoMType): boolean {
  return Boolean(
    minutes.summary ||
      minutes.date ||
      minutes.attendees.length ||
      minutes.decisions.length ||
      minutes.actionItems.length ||
      minutes.risks.length ||
      minutes.openQuestions.length
  );
}

function MomSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <ul className="list-disc space-y-1 pl-4 text-sm text-foreground">
        {items.map((item, i) => (
          <li key={`${title}-${i}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

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
  const structured = hasStructuredContent(minutes);

  const body = isEmpty ? (
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
      ) : structured ? (
        <>
          {minutes.title ? (
            <h3 className="mb-1 text-base font-semibold text-foreground">
              {minutes.title}
            </h3>
          ) : null}
          {minutes.date ? (
            <p className="mb-3 text-sm text-muted-foreground">{minutes.date}</p>
          ) : null}
          {minutes.summary ? (
            <section className="mb-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Summary
              </h4>
              <p className="text-sm leading-relaxed text-foreground">
                {minutes.summary}
              </p>
            </section>
          ) : null}
          <MomSection title="Attendees" items={minutes.attendees} />
          <MomSection title="Decisions" items={minutes.decisions} />
          <MomSection title="Action items" items={minutes.actionItems} />
          <MomSection title="Risks / blockers" items={minutes.risks} />
          <MomSection title="Open questions" items={minutes.openQuestions} />
        </>
      ) : minutes.rawBody ? (
        <MomMarkdown content={minutes.rawBody} />
      ) : minutes.title ? (
        <h3 className="text-base font-semibold text-foreground">
          {minutes.title}
        </h3>
      ) : null}
    </div>
  );

  if (embedded) {
    return <div className="h-full overflow-hidden">{body}</div>;
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
        {body}
      </div>
    </article>
  );
}
