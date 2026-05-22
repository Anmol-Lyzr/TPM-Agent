"use client";

import { FileText } from "lucide-react";
import type { MinutesOfMeeting, MeetingMetadata, MomActionItem } from "@/types/meetingPayload";
import { EmptyState } from "@/components/ui/EmptyState";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

type Props = {
  minutes: MinutesOfMeeting | null;
  metadata: MeetingMetadata | null;
  isLoading?: boolean;
  isEmpty: boolean;
  embedded?: boolean;
  editable?: boolean;
  ownerOptions?: string[];
  onChange?: (nextMinutes: MinutesOfMeeting, nextMetadata?: MeetingMetadata) => void;
};

export function MeetingMinutes({
  minutes,
  metadata,
  isLoading = false,
  isEmpty,
  embedded = false,
  editable = false,
  ownerOptions = [],
  onChange,
}: Props) {
  const updateMinutes = (updater: (current: MinutesOfMeeting) => MinutesOfMeeting) => {
    if (!minutes || !onChange) return;
    onChange(updater(minutes), metadata ?? undefined);
  };

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
          {editable ? (
            <textarea value={minutes.purpose} onChange={(e) => updateMinutes((curr) => ({ ...curr, purpose: e.target.value }))} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1.5 text-sm" />
          ) : (
            <p className="text-sm leading-relaxed text-foreground">{minutes.purpose}</p>
          )}
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
                  <td className="px-2 py-2 text-foreground">{editable ? <input value={d.decision} onChange={(e) => updateMinutes((curr) => ({ ...curr, key_decisions: curr.key_decisions.map((item) => item.decision_id === d.decision_id ? { ...item, decision: e.target.value } : item) }))} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" /> : d.decision}</td>
                  <td className="px-2 py-2 text-muted-foreground">{editable ? <input value={d.decided_by} onChange={(e) => updateMinutes((curr) => ({ ...curr, key_decisions: curr.key_decisions.map((item) => item.decision_id === d.decision_id ? { ...item, decided_by: e.target.value } : item) }))} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" /> : d.decided_by || "—"}</td>
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
                  <td className="px-2 py-2 text-foreground max-w-[260px]">{editable ? <input value={item.action} onChange={(e) => updateMinutes((curr) => ({ ...curr, action_items: curr.action_items.map((a) => a.action_id === item.action_id ? { ...a, action: e.target.value } : a) }))} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" /> : item.action}</td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {editable ? (
                      <select value={item.owner} onChange={(e) => updateMinutes((curr) => ({ ...curr, action_items: curr.action_items.map((a) => a.action_id === item.action_id ? { ...a, owner: e.target.value } : a) }))} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs">
                        <option value="">Select owner</option>
                        {ownerOptions.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
                      </select>
                    ) : (
                      item.owner || "—"
                    )}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">{editable ? <input type="date" value={item.due_date} onChange={(e) => updateMinutes((curr) => ({ ...curr, action_items: curr.action_items.map((a) => a.action_id === item.action_id ? { ...a, due_date: e.target.value } : a) }))} className="rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" /> : item.due_date || "—"}</td>
                  <td className="px-2 py-2">
                    {editable ? (
                      <select value={item.status} onChange={(e) => updateMinutes((curr) => ({ ...curr, action_items: curr.action_items.map((a) => a.action_id === item.action_id ? { ...a, status: e.target.value as MomActionItem["status"] } : a) }))} className="rounded border border-border/40 bg-background/60 px-2 py-1 text-xs">
                        <option>Open</option><option>In Progress</option><option>Done</option><option>Blocked</option>
                      </select>
                    ) : (
                      item.status
                    )}
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
                {editable ? (
                  <>
                    <input value={h.topic} onChange={(e) => updateMinutes((curr) => ({ ...curr, discussion_highlights: curr.discussion_highlights.map((item, j) => j === i ? { ...item, topic: e.target.value } : item) }))} className="mr-2 rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" />
                    <input value={h.summary} onChange={(e) => updateMinutes((curr) => ({ ...curr, discussion_highlights: curr.discussion_highlights.map((item, j) => j === i ? { ...item, summary: e.target.value } : item) }))} className="w-[60%] rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" />
                  </>
                ) : (
                  <>
                    <span className="font-medium text-foreground">{h.topic}: </span>
                    <span className="text-muted-foreground">{h.summary}</span>
                  </>
                )}
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
              <li key={i}>{editable ? <input value={item} onChange={(e) => updateMinutes((curr) => ({ ...curr, risks_and_dependencies_summary: curr.risks_and_dependencies_summary.map((v, j) => j === i ? e.target.value : v) }))} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" /> : item}</li>
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
                {editable ? <input value={m.milestone} onChange={(e) => updateMinutes((curr) => ({ ...curr, next_milestones: curr.next_milestones.map((nm, j) => j === i ? { ...nm, milestone: e.target.value } : nm) }))} className="rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" /> : <span className="text-foreground">{m.milestone}</span>}
                {m.target_date ? (
                  editable ? <input type="date" value={m.target_date} onChange={(e) => updateMinutes((curr) => ({ ...curr, next_milestones: curr.next_milestones.map((nm, j) => j === i ? { ...nm, target_date: e.target.value } : nm) }))} className="rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" /> : <span className="text-muted-foreground whitespace-nowrap">— {m.target_date}</span>
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
