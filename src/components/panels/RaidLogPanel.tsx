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
}: Props) {
  const rows = raid ? flattenRaid(raid) : [];
  const totalCount =
    (raid?.risks?.length ?? 0) +
    (raid?.assumptions?.length ?? 0) +
    (raid?.issues?.length ?? 0) +
    (raid?.dependencies?.length ?? 0);

  const content = isEmpty || totalCount === 0 ? (
    <EmptyState
      icon={ShieldAlert}
      title="No RAID entries yet"
      description="Structured RAID rows (Risk, Assumption, Issue, Dependency) will appear after analysis."
    />
  ) : (
    <div className="h-full overflow-auto p-2">
      <table className="w-full min-w-[720px] text-left text-xs">
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
          {rows.map((row, idx) => (
            <tr key={`${row.type}-${row.id}-${idx}`} className="border-b border-border/30 align-top hover:bg-black/[0.02]">
              <td className="px-2 py-2.5">
                <Badge variant={TYPE_VARIANT[row.type]}>{row.type}</Badge>
              </td>
              <td className="px-2 py-2.5 font-mono text-[11px] text-muted-foreground">
                {row.id || "—"}
              </td>
              <td className="max-w-[200px] px-2 py-2.5 text-foreground">
                {row.description || "—"}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">{row.owner || "—"}</td>
              <td className="px-2 py-2.5 text-muted-foreground">{row.impact || "—"}</td>
              <td className="px-2 py-2.5 text-muted-foreground">{row.probability || "—"}</td>
              <td className="px-2 py-2.5">
                {row.status ? (
                  <Badge variant="default">{row.status}</Badge>
                ) : "—"}
              </td>
              <td className="max-w-[160px] px-2 py-2.5 text-muted-foreground">
                {row.mitigation || "—"}
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-muted-foreground">
                {row.date || "—"}
              </td>
            </tr>
          ))}
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
