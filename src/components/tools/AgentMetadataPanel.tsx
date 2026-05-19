"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Database,
  Key,
  Loader2,
  Server,
} from "lucide-react";
import { cn } from "@/lib/cn";

type MetadataResponse = {
  name: string;
  tagline: string;
  version: string;
  standard: string;
  description: string;
  lyzr: {
    inferenceEndpoint: string;
    meetingAgentId: string;
    consoleAgentId: string;
  };
  outputSections: Array<{
    key: string;
    title: string;
    description: string;
  }>;
  documentMetadata: Array<{ field: string; example: string }>;
  meetingMetadata: Array<{ field: string; example: string }>;
  integrations: string[];
  runtime: {
    apiKeyConfigured: boolean;
    userIdConfigured: boolean;
    mongoConfigured: boolean;
    meetingAgentId: string;
    consoleAgentId: string;
    userIdMasked: string;
    dbName: string;
  };
};

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        ok ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
      )}
    >
      {ok ? (
        <CheckCircle2 className="h-2.5 w-2.5" />
      ) : (
        <AlertCircle className="h-2.5 w-2.5" />
      )}
      {label}
    </span>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/30 py-2 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="break-all text-right font-mono text-[11px] text-foreground sm:max-w-[65%]">
        {value}
      </span>
    </div>
  );
}

export function AgentMetadataPanel() {
  const [data, setData] = useState<MetadataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/agent/metadata");
        if (!res.ok) throw new Error(`Failed to load metadata (${res.status})`);
        const json = (await res.json()) as MetadataResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load metadata");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="glass-card mb-6 flex items-center justify-center rounded-xl p-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-card mb-6 rounded-xl border border-destructive/20 p-5 text-sm text-destructive">
        {error ?? "Metadata unavailable"}
      </div>
    );
  }

  const envReady =
    data.runtime.apiKeyConfigured &&
    data.runtime.userIdConfigured &&
    data.runtime.mongoConfigured;

  return (
    <section className="mb-8 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Agent Metadata</h2>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          v{data.version}
        </span>
        {envReady ? (
          <StatusPill ok label="Environment ready" />
        ) : (
          <StatusPill ok={false} label="Check .env.local" />
        )}
      </div>

      <p className="text-sm text-muted-foreground">{data.description}</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass-card rounded-xl p-5 lg:col-span-1">
          <div className="mb-3 flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground">Lyzr runtime</h3>
          </div>
          <MetaRow label="Agent name" value={data.name} />
          <MetaRow label="Standard" value={data.standard} />
          <MetaRow label="Meeting agent ID" value={data.runtime.meetingAgentId} />
          <MetaRow label="Console agent ID" value={data.runtime.consoleAgentId} />
          <MetaRow label="User ID" value={data.runtime.userIdMasked} />
          <MetaRow label="Inference API" value={data.lyzr.inferenceEndpoint} />
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusPill ok={data.runtime.apiKeyConfigured} label="API key" />
            <StatusPill ok={data.runtime.userIdConfigured} label="User ID" />
            <StatusPill ok={data.runtime.mongoConfigured} label="MongoDB" />
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground">Output sections</h3>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.outputSections.map((section) => (
              <div
                key={section.key}
                className="rounded-lg border border-border/40 bg-black/[0.02] p-3"
              >
                <p className="text-xs font-semibold text-foreground">{section.title}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                  {section.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {data.integrations.map((intg) => (
              <span
                key={intg}
                className="rounded-lg bg-black/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {intg}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="glass-card rounded-xl p-5">
          <div className="mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground">
              Meeting metadata schema
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Field</th>
                  <th className="pb-2 font-medium">Example</th>
                </tr>
              </thead>
              <tbody>
                {data.meetingMetadata.map((row) => (
                  <tr key={row.field} className="border-b border-border/20">
                    <td className="py-1.5 pr-3 font-mono text-foreground">{row.field}</td>
                    <td className="py-1.5 text-muted-foreground">{row.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground">Document metadata</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Field</th>
                  <th className="pb-2 font-medium">Example</th>
                </tr>
              </thead>
              <tbody>
                {data.documentMetadata.map((row) => (
                  <tr key={row.field} className="border-b border-border/20">
                    <td className="py-1.5 pr-3 font-mono text-foreground">{row.field}</td>
                    <td className="py-1.5 text-muted-foreground">{row.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Sessions stored in MongoDB ({data.runtime.dbName}) with parsed plan, issues,
            RAID, and MoM payloads.
          </p>
        </div>
      </div>
    </section>
  );
}
