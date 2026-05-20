"use client";

import { FileText } from "lucide-react";
import type { MinutesOfMeeting, MeetingMetadata, MomActionItem } from "@/types/meetingPayload";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

type Props = {
  minutes: MinutesOfMeeting | null;
  metadata: MeetingMetadata | null;
  isLoading?: boolean;
  isEmpty: boolean;
  embedded?: boolean;
};

function actionStatusVariant(status: MomActionItem["status"]): "success" | "warning" | "danger" | "default" {
  switch (status) {
    case "Done": return "success";
    case "In Progress": return "warning";
    case "Blocked": return "danger";
    default: return "default";
  }
}

export function MeetingMinutes({
  minutes,
  metadata,
  isLoading = false,
  isEmpty,
  embedded = false,
}: Props) {
  const body = isEmpty || !minutes ? (
    <EmptyState
      icon={FileText}
      title="No meeting minutes yet"
      description="MoM content will appear after analysis."
    />
  ) : (
    <div className="h-full overflow-auto p-4 space-y-5">
      {/* Meeting title / metadata header */}
      {metadata?.meeting_title ? (
        <div className="mb-2">
          <h3 className="text-base font-semibold text-foreground">{metadata.meeting_title}</h3>
          {metadata.date ? (
            <p className="text-sm text-muted-foreground mt-0.5">{metadata.date}</p>
          ) : null}
        </div>
      ) : null}

      {/* Purpose */}
      {minutes.purpose ? (
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Purpose
          </h4>
          <p className="text-sm leading-relaxed text-foreground">{minutes.purpose}</p>
        </section>
      ) : null}

      {/* Key Decisions */}
      {minutes.key_decisions?.length > 0 ? (
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Key Decisions
          </h4>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground">
                <th className="px-2 py-1.5 font-medium">ID</th>
                <th className="px-2 py-1.5 font-medium">Decision</th>
                <th className="px-2 py-1.5 font-medium">Decided By</th>
              </tr>
            </thead>
            <tbody>
              {minutes.key_decisions.map((d) => (
                <tr key={d.decision_id} className="border-b border-border/20 hover:bg-black/[0.02]">
                  <td className="px-2 py-2 font-mono text-[11px] text-muted-foreground">{d.decision_id}</td>
                  <td className="px-2 py-2 text-foreground">{d.decision}</td>
                  <td className="px-2 py-2 text-muted-foreground">{d.decided_by || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {/* Action Items */}
      {minutes.action_items?.length > 0 ? (
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Action Items
          </h4>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground">
                <th className="px-2 py-1.5 font-medium">ID</th>
                <th className="px-2 py-1.5 font-medium">Action</th>
                <th className="px-2 py-1.5 font-medium">Owner</th>
                <th className="px-2 py-1.5 font-medium">Due Date</th>
                <th className="px-2 py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {minutes.action_items.map((item) => (
                <tr key={item.action_id} className="border-b border-border/20 hover:bg-black/[0.02]">
                  <td className="px-2 py-2 font-mono text-[11px] text-muted-foreground">{item.action_id}</td>
                  <td className="px-2 py-2 text-foreground max-w-[260px]">{item.action}</td>
                  <td className="px-2 py-2 text-muted-foreground">{item.owner || "—"}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">{item.due_date || "—"}</td>
                  <td className="px-2 py-2">
                    <Badge variant={actionStatusVariant(item.status)}>{item.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {/* Discussion Highlights */}
      {minutes.discussion_highlights?.length > 0 ? (
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Discussion Highlights
          </h4>
          <ul className="space-y-2">
            {minutes.discussion_highlights.map((h, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium text-foreground">{h.topic}: </span>
                <span className="text-muted-foreground">{h.summary}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Risks & Dependencies */}
      {minutes.risks_and_dependencies_summary?.length > 0 ? (
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Risks &amp; Dependencies
          </h4>
          <ul className="list-disc space-y-1 pl-4 text-sm text-foreground">
            {minutes.risks_and_dependencies_summary.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Next Milestones */}
      {minutes.next_milestones?.length > 0 ? (
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Next Milestones
          </h4>
          <ul className="space-y-1">
            {minutes.next_milestones.map((m, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-foreground">{m.milestone}</span>
                {m.target_date ? (
                  <span className="text-muted-foreground whitespace-nowrap">— {m.target_date}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
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
        subtitle="Meeting summary"
      />
      <div className="relative flex-1 overflow-hidden">
        {isLoading ? <LoadingOverlay /> : null}
        {body}
      </div>
    </article>
  );
}
