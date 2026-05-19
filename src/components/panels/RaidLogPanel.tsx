"use client";

import { AlertTriangle, Plus, ShieldAlert } from "lucide-react";
import { MomMarkdown } from "@/components/panels/MomMarkdown";
import type { RaidCategory, RaidLogRow } from "@/types/tpm";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { PanelExportActions } from "@/components/ui/PanelExportActions";
import {
  canExportRaidLog,
  exportRaidLogDocument,
  exportRaidLogExcel,
} from "@/lib/panelExports";
import { createRaidRow, RAID_CATEGORIES } from "@/lib/raidLog";

const cellInput =
  "w-full min-w-0 rounded border border-border/50 bg-background/60 px-1.5 py-1 text-xs focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20";

const CATEGORY_VARIANT: Record<
  RaidCategory,
  "default" | "success" | "warning" | "danger"
> = {
  Risk: "danger",
  Assumption: "warning",
  Issue: "default",
  Dependency: "success",
};

type Props = {
  raidLog: RaidLogRow[];
  sectionMarkdown?: string;
  isLoading?: boolean;
  isEmpty: boolean;
  embedded?: boolean;
  isEditing?: boolean;
  onDraftChange?: (raidLog: RaidLogRow[]) => void;
};

export function RaidLogPanel({
  raidLog,
  sectionMarkdown,
  isLoading = false,
  isEmpty,
  embedded = false,
  isEditing = false,
  onDraftChange,
}: Props) {
  const showMarkdown =
    raidLog.length === 0 && Boolean(sectionMarkdown?.trim());
  const canExport =
    canExportRaidLog(raidLog, sectionMarkdown) && !isEmpty && !isLoading;

  const updateRow = (index: number, patch: Partial<RaidLogRow>) => {
    if (!onDraftChange) return;
    onDraftChange(
      raidLog.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const addRow = (category: RaidCategory) => {
    if (!onDraftChange) return;
    onDraftChange([...raidLog, createRaidRow(category)]);
  };

  const removeRow = (index: number) => {
    if (!onDraftChange) return;
    onDraftChange(raidLog.filter((_, i) => i !== index));
  };

  const content = isEmpty ? (
    <EmptyState
      icon={ShieldAlert}
      title="No RAID entries yet"
      description="Structured RAID rows (Risk, Assumption, Issue, Dependency) — not the meeting summary. Re-run Analyze Meeting or add rows while editing."
    />
  ) : showMarkdown && sectionMarkdown ? (
    <div className="h-full overflow-auto p-3">
      <MomMarkdown content={sectionMarkdown} />
    </div>
  ) : raidLog.length === 0 ? (
    <EmptyState
      icon={ShieldAlert}
      title="No RAID entries yet"
      description="Structured RAID rows (Risk, Assumption, Issue, Dependency) — not the meeting summary. Re-run Analyze Meeting or add rows while editing."
    />
  ) : (
    <div className="flex h-full flex-col overflow-hidden">
      {isEditing ? (
        <div className="flex flex-wrap gap-2 border-b border-border/40 px-3 py-2">
          {RAID_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => addRow(cat)}
              className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-black/[0.03] px-2 py-1 text-[11px] font-medium text-foreground hover:bg-black/[0.06]"
            >
              <Plus className="h-3 w-3" />
              Add {cat}
            </button>
          ))}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="border-b border-border/50 text-muted-foreground">
              <th className="px-2 py-2 font-medium">Type</th>
              <th className="px-2 py-2 font-medium">Description</th>
              <th className="px-2 py-2 font-medium">Owner</th>
              <th className="px-2 py-2 font-medium">Impact</th>
              <th className="px-2 py-2 font-medium">Probability</th>
              <th className="px-2 py-2 font-medium">Status</th>
              <th className="px-2 py-2 font-medium">Mitigation</th>
              <th className="px-2 py-2 font-medium">Target</th>
              {isEditing ? <th className="w-8 px-2 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {raidLog.map((row, idx) => (
              <tr
                key={row.id}
                className="border-b border-border/30 align-top hover:bg-black/[0.02]"
              >
                <td className="px-2 py-2.5">
                  {isEditing ? (
                    <select
                      value={row.category}
                      onChange={(e) =>
                        updateRow(idx, {
                          category: e.target.value as RaidCategory,
                        })
                      }
                      className={cellInput}
                    >
                      {RAID_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant={CATEGORY_VARIANT[row.category]}>
                      {row.category}
                    </Badge>
                  )}
                </td>
                <td className="max-w-[200px] px-2 py-2.5">
                  {isEditing ? (
                    <textarea
                      value={row.description}
                      onChange={(e) =>
                        updateRow(idx, { description: e.target.value })
                      }
                      rows={2}
                      className={cellInput}
                    />
                  ) : (
                    <span className="text-foreground">{row.description}</span>
                  )}
                </td>
                <td className="px-2 py-2.5">
                  {isEditing ? (
                    <input
                      value={row.owner}
                      onChange={(e) =>
                        updateRow(idx, { owner: e.target.value })
                      }
                      className={cellInput}
                    />
                  ) : (
                    row.owner || "—"
                  )}
                </td>
                <td className="px-2 py-2.5">
                  {isEditing ? (
                    <input
                      value={row.impact}
                      onChange={(e) =>
                        updateRow(idx, { impact: e.target.value })
                      }
                      className={cellInput}
                    />
                  ) : (
                    row.impact || "—"
                  )}
                </td>
                <td className="px-2 py-2.5">
                  {isEditing ? (
                    <input
                      value={row.probability}
                      onChange={(e) =>
                        updateRow(idx, { probability: e.target.value })
                      }
                      className={cellInput}
                    />
                  ) : (
                    row.probability || "—"
                  )}
                </td>
                <td className="px-2 py-2.5">
                  {isEditing ? (
                    <select
                      value={row.status}
                      onChange={(e) =>
                        updateRow(idx, {
                          status: e.target.value as RaidLogRow["status"],
                        })
                      }
                      className={cellInput}
                    >
                      <option value="Open">Open</option>
                      <option value="Mitigating">Mitigating</option>
                      <option value="Closed">Closed</option>
                      <option value="Accepted">Accepted</option>
                    </select>
                  ) : (
                    <Badge variant="default">{row.status}</Badge>
                  )}
                </td>
                <td className="max-w-[160px] px-2 py-2.5">
                  {isEditing ? (
                    <textarea
                      value={row.mitigation}
                      onChange={(e) =>
                        updateRow(idx, { mitigation: e.target.value })
                      }
                      rows={2}
                      className={cellInput}
                    />
                  ) : (
                    row.mitigation || "—"
                  )}
                </td>
                <td className="px-2 py-2.5 whitespace-nowrap">
                  {isEditing ? (
                    <input
                      value={row.targetDate}
                      onChange={(e) =>
                        updateRow(idx, { targetDate: e.target.value })
                      }
                      className={cellInput}
                    />
                  ) : (
                    row.targetDate || "—"
                  )}
                </td>
                {isEditing ? (
                  <td className="px-2 py-2.5">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="text-[10px] text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (embedded) {
    return <div className="h-full overflow-hidden">{content}</div>;
  }

  return (
    <article className="glass-card relative flex min-h-[280px] flex-col overflow-hidden rounded-xl">
      <PanelHeader
        icon={AlertTriangle}
        title="RAID Log"
        subtitle="Risks, assumptions, issues & dependencies"
        count={raidLog.length || undefined}
        actions={
          <PanelExportActions
            disabled={!canExport}
            onExportExcel={() => exportRaidLogExcel(raidLog, sectionMarkdown)}
            onExportDocument={() =>
              exportRaidLogDocument(raidLog, sectionMarkdown)
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
