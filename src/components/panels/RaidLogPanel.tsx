"use client";

import { ShieldAlert } from "lucide-react";
import type { RaidLogPayload } from "@/types/meetingPayload";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

type Props = {
  raid: RaidLogPayload | null;
  isLoading?: boolean;
  isEmpty: boolean;
  embedded?: boolean;
  editable?: boolean;
  ownerOptions?: string[];
  onChange?: (next: RaidLogPayload) => void;
};

type RaidType = "Risk" | "Assumption" | "Issue" | "Dependency";

interface FlatRaidRow {
  type: RaidType;
  id: string;
  description: string;
  owner: string;
  impact: string;
  probability: string;
  status: string;
  mitigation: string;
  date: string;
}

const TYPE_VARIANT: Record<RaidType, "danger" | "warning" | "default" | "success"> = {
  Risk: "danger",
  Assumption: "warning",
  Issue: "default",
  Dependency: "success",
};

function mapRiskStatus(status: string): string {
  if (status === "Mitigated") return "Mitigating";
  return status;
}

function mapAssumptionStatus(status: string): string {
  if (status === "Validated") return "Accepted";
  if (status === "Invalid") return "Closed";
  return status;
}

function mapIssueStatus(status: string): string {
  if (status === "In Remediation") return "Mitigating";
  return status;
}

function mapDependencyStatus(status: string): string {
  if (status === "Completed") return "Closed";
  return status;
}

function flattenRaid(raid: RaidLogPayload): FlatRaidRow[] {
  const rows: FlatRaidRow[] = [];

  for (const r of raid.risks ?? []) {
    rows.push({
      type: "Risk",
      id: r.risk_id,
      description: r.description,
      owner: r.owner,
      impact: r.impact,
      probability: r.probability,
      status: mapRiskStatus(r.status),
      mitigation: r.mitigation_strategy,
      date: r.identified_date,
    });
  }

  for (const a of raid.assumptions ?? []) {
    rows.push({
      type: "Assumption",
      id: a.assumption_id,
      description: a.description,
      owner: a.owner,
      impact: a.impact_if_invalid,
      probability: "",
      status: mapAssumptionStatus(a.status),
      mitigation: a.validation_approach,
      date: a.identified_date,
    });
  }

  for (const i of raid.issues ?? []) {
    rows.push({
      type: "Issue",
      id: i.issue_id,
      description: i.description,
      owner: i.owner,
      impact: i.impact,
      probability: "",
      status: mapIssueStatus(i.status),
      mitigation: i.resolution_path,
      date: i.identified_date,
    });
  }

  for (const d of raid.dependencies ?? []) {
    rows.push({
      type: "Dependency",
      id: d.dependency_id,
      description: d.description,
      owner: d.owner,
      impact: d.impact_if_delayed,
      probability: "",
      status: mapDependencyStatus(d.status),
      mitigation: "",
      date: d.expected_resolution_date,
    });
  }

  return rows;
}

export function RaidLogPanel({
  raid,
  isLoading = false,
  isEmpty,
  embedded = false,
  editable = false,
  ownerOptions = [],
  onChange,
}: Props) {
  const rows = raid ? flattenRaid(raid) : [];
  const totalCount =
    (raid?.risks?.length ?? 0) +
    (raid?.assumptions?.length ?? 0) +
    (raid?.issues?.length ?? 0) +
    (raid?.dependencies?.length ?? 0);

  const updateItem = (
    section: keyof RaidLogPayload,
    idx: number,
    key: string,
    value: string
  ) => {
    if (!raid || !onChange) return;
    if (section === "risks") {
      const next = {
        ...raid,
        risks: raid.risks.map((item, i) =>
          i !== idx
            ? item
            : {
                ...item,
                [key]:
                  key === "related_tasks"
                    ? value.split(",").map((v) => v.trim()).filter(Boolean)
                    : value,
              }
        ),
      };
      onChange(next);
      return;
    }
    if (section === "assumptions") {
      const next = {
        ...raid,
        assumptions: raid.assumptions.map((item, i) =>
          i !== idx ? item : { ...item, [key]: value }
        ),
      };
      onChange(next);
      return;
    }
    if (section === "issues") {
      const next = {
        ...raid,
        issues: raid.issues.map((item, i) =>
          i !== idx
            ? item
            : {
                ...item,
                [key]:
                  key === "related_tasks"
                    ? value.split(",").map((v) => v.trim()).filter(Boolean)
                    : value,
              }
        ),
      };
      onChange(next);
      return;
    }
    const next = {
      ...raid,
      dependencies: raid.dependencies.map((item, i) =>
        i !== idx
          ? item
          : {
              ...item,
              [key]:
                key === "dependent_tasks"
                  ? value.split(",").map((v) => v.trim()).filter(Boolean)
                  : value,
            }
      ),
    };
    onChange(next);
  };

  const content = isEmpty || totalCount === 0 ? (
    <EmptyState
      icon={ShieldAlert}
      title="No RAID entries yet"
      description="Structured RAID rows (Risk, Assumption, Issue, Dependency) will appear after analysis."
    />
  ) : (
    <div className="h-full overflow-auto p-2">
      <table className="w-full min-w-[860px] text-left text-xs">
        <thead>
          <tr className="border-b border-border/50 text-muted-foreground">
            <th className="px-2 py-2 font-medium">Type</th>
            <th className="px-2 py-2 font-medium">ID</th>
            <th className="px-2 py-2 font-medium">Description</th>
            <th className="px-2 py-2 font-medium">Owner</th>
            <th className="px-2 py-2 font-medium">Impact</th>
            <th className="px-2 py-2 font-medium">Probability</th>
            <th className="px-2 py-2 font-medium">Status</th>
            <th className="px-2 py-2 font-medium">Mitigation/Resolution</th>
            <th className="px-2 py-2 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const src =
              row.type === "Risk"
                ? { section: "risks" as const, index: raid?.risks.findIndex((r) => r.risk_id === row.id) ?? -1 }
                : row.type === "Assumption"
                  ? { section: "assumptions" as const, index: raid?.assumptions.findIndex((a) => a.assumption_id === row.id) ?? -1 }
                  : row.type === "Issue"
                    ? { section: "issues" as const, index: raid?.issues.findIndex((i) => i.issue_id === row.id) ?? -1 }
                    : { section: "dependencies" as const, index: raid?.dependencies.findIndex((d) => d.dependency_id === row.id) ?? -1 };
            return (
            <tr key={`${row.type}-${row.id}-${idx}`} className="border-b border-border/30 align-top hover:bg-black/[0.02]">
              <td className="px-2 py-2.5">
                <Badge variant={TYPE_VARIANT[row.type]}>{row.type}</Badge>
              </td>
              <td className="px-2 py-2.5 font-mono text-[11px] text-muted-foreground">
                {row.id || "—"}
              </td>
              <td className="max-w-[200px] px-2 py-2.5 text-foreground">
                {editable ? (
                  <input value={row.description} onChange={(e) => src.index >= 0 && updateItem(src.section, src.index, "description", e.target.value)} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" />
                ) : (
                  row.description || "—"
                )}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">
                {editable ? (
                  <select value={row.owner} onChange={(e) => src.index >= 0 && updateItem(src.section, src.index, "owner", e.target.value)} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs">
                    <option value="">Select owner</option>
                    {ownerOptions.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
                  </select>
                ) : (
                  row.owner || "—"
                )}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">{editable ? <input value={row.impact} onChange={(e) => src.index >= 0 && updateItem(src.section, src.index, row.type === "Assumption" ? "impact_if_invalid" : row.type === "Dependency" ? "impact_if_delayed" : "impact", e.target.value)} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" /> : row.impact || "—"}</td>
              <td className="px-2 py-2.5 text-muted-foreground">{editable ? <input value={row.probability} onChange={(e) => src.index >= 0 && updateItem(src.section, src.index, "probability", e.target.value)} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" /> : row.probability || "—"}</td>
              <td className="px-2 py-2.5">
                {editable ? <input value={row.status} onChange={(e) => src.index >= 0 && updateItem(src.section, src.index, "status", e.target.value)} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" /> : row.status || "—"}
              </td>
              <td className="max-w-[160px] px-2 py-2.5 text-muted-foreground">
                {editable ? <input value={row.mitigation} onChange={(e) => src.index >= 0 && updateItem(src.section, src.index, row.type === "Risk" ? "mitigation_strategy" : row.type === "Issue" ? "resolution_path" : row.type === "Assumption" ? "validation_approach" : "description", e.target.value)} className="w-full rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" /> : row.mitigation || "—"}
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-muted-foreground">
                {editable ? <input type="date" value={/\d{4}-\d{2}-\d{2}/.test(row.date) ? row.date : ""} onChange={(e) => src.index >= 0 && updateItem(src.section, src.index, row.type === "Dependency" ? "expected_resolution_date" : "identified_date", e.target.value)} className="rounded border border-border/40 bg-background/60 px-2 py-1 text-xs" /> : row.date || "—"}
              </td>
            </tr>
          )})}
        </tbody>
      </table>
    </div>
  );

  if (embedded) {
    return <div className="h-full overflow-hidden">{content}</div>;
  }

  return (
    <article className="glass-card relative flex min-h-[280px] flex-col overflow-hidden rounded-xl">
      <PanelHeader
        icon={ShieldAlert}
        title="RAID Log"
        subtitle="Risks, assumptions, issues & dependencies"
        count={totalCount || undefined}
      />
      <div className="relative flex-1 overflow-hidden">
        {isLoading ? <LoadingOverlay /> : null}
        {content}
      </div>
    </article>
  );
}
