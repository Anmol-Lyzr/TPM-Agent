"use client";

import { AlertTriangle } from "lucide-react";
import type { AgentParseMeta } from "@/types/tpm";

export function ParseWarningsBanner({ meta }: { meta?: AgentParseMeta }) {
  if (!meta?.warnings?.length) return null;

  return (
    <details className="shrink-0 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        {meta.warnings.length} parse warning
        {meta.warnings.length === 1 ? "" : "s"} — data may be incomplete
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] opacity-90">
        {meta.warnings.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] opacity-70">
        Parsed {meta.counts.issues} issues · {meta.counts.projectPlan} plan rows
        · {meta.counts.raidLog} RAID ·{" "}
        {meta.sectionKeysFound.join(", ") || "no sections detected"}
        {meta.usedStructuredJson ? " · JSON payload" : " · markdown"}
      </p>
    </details>
  );
}
