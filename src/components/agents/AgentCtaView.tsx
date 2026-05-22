"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronUp, Loader2, Sparkles, X } from "lucide-react";
import {
  type AgentCategoryConfig,
  type AgentSlug,
  buildCategoryStats,
  getAgentConfig,
  normalizeCtaCategory,
} from "@/lib/ctaAgents";
import { executeCtaJiraActionsForCta, fetchBulkCtas } from "@/lib/ctaClient";
import type { CtaAggregateRow } from "@/lib/db/sessions";
import { fetchSession, saveSession } from "@/lib/sessionStore";
import type { CallToActionEntry } from "@/types/meetingPayload";

type CtaStatus = CallToActionEntry["status"];

function ctaKey(sessionId: string, ctaId: string) {
  return `${sessionId}::${ctaId}`;
}

export function AgentCtaView({ agentSlug }: { agentSlug: AgentSlug }) {
  const agent = getAgentConfig(agentSlug);
  const [rows, setRows] = useState<CtaAggregateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [expandedCtaKey, setExpandedCtaKey] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, CtaStatus>>({});
  const [ctaSavingKey, setCtaSavingKey] = useState<string | null>(null);
  const [ctaError, setCtaError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const items = await fetchBulkCtas();
      setRows(items);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load actions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const agentCategories = agent.categories;

  const aggregatedItems = useMemo(() => {
    const schemaCategories = new Set(agentCategories.map((c) => c.schemaCategory));
    return rows
      .map((row) => ({
        sessionId: row.sessionId,
        projectTitle: row.projectTitle,
        projectKey: row.projectKey,
        cta: {
          ...row.cta,
          status:
            (statusOverrides[ctaKey(row.sessionId, row.cta.cta_id)] ??
              row.cta.status) as CtaStatus,
        },
      }))
      .filter((item) => {
        const cat = normalizeCtaCategory(item.cta.category);
        return cat && schemaCategories.has(cat);
      });
  }, [rows, agentCategories, statusOverrides]);

  const priorityClass = (priority: string) => {
    if (priority === "Critical") return "bg-destructive text-destructive-foreground";
    if (priority === "High") return "bg-destructive/75 text-destructive-foreground";
    if (priority === "Medium") return "bg-amber-500/80 text-white";
    return "bg-muted text-muted-foreground";
  };

  const statusLabel = (status: string) => {
    if (status === "Executed") return "Executed";
    if (status === "Approved") return "Approved";
    if (status === "Dismissed") return "Rejected";
    return "Pending";
  };

  const persistCtaStatus = async (
    sessionId: string,
    ctaId: string,
    status: CtaStatus
  ) => {
    const session = await fetchSession(sessionId);
    if (!session?.payload) throw new Error("Session not found");
    const updatedPayload = {
      ...session.payload,
      call_to_actions: (session.payload.call_to_actions ?? []).map((cta) =>
        cta.cta_id === ctaId ? { ...cta, status } : cta
      ),
    };
    await saveSession(sessionId, { payload: updatedPayload }, { skipAtlassianSync: true });
    setRows((prev) =>
      prev.map((row) =>
        row.sessionId === sessionId && row.cta.cta_id === ctaId
          ? { ...row, cta: { ...row.cta, status } }
          : row
      )
    );
    setStatusOverrides((prev) => ({ ...prev, [ctaKey(sessionId, ctaId)]: status }));
  };

  const handleCtaDecision = async (
    sessionId: string,
    cta: CallToActionEntry,
    decision: "approve" | "reject"
  ) => {
    const key = ctaKey(sessionId, cta.cta_id);
    setCtaSavingKey(key);
    setCtaError(null);
    setActionNotice(null);

    try {
      if (decision === "reject") {
        await persistCtaStatus(sessionId, cta.cta_id, "Dismissed");
        setExpandedCtaKey(null);
        return;
      }

      const jiraActions = cta.jira_actions ?? [];
      if (jiraActions.length > 0) {
        const exec = await executeCtaJiraActionsForCta(cta);
        if (!exec.ok) {
          setStatusOverrides((prev) => {
            const copy = { ...prev };
            delete copy[key];
            return copy;
          });
          setCtaError(
            exec.errors.length
              ? exec.errors.join("; ")
              : "Jira actions failed. CTA remains pending — retry after fixing."
          );
          return;
        }
        await persistCtaStatus(sessionId, cta.cta_id, "Executed");
        setActionNotice(
          `CTA executed in Jira (${exec.steps.map((s) => s.operation).join(" → ")})`
        );
      } else {
        await persistCtaStatus(sessionId, cta.cta_id, "Executed");
      }
      setExpandedCtaKey(null);
    } catch (err) {
      setStatusOverrides((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      setCtaError(err instanceof Error ? err.message : "Failed to update CTA");
    } finally {
      setCtaSavingKey(null);
    }
  };

  const toggleCategory = (config: AgentCategoryConfig) => {
    setExpandedCategoryId((prev) => {
      const closing = prev === config.id;
      if (closing) setExpandedCtaKey(null);
      return closing ? null : config.id;
    });
    setCtaError(null);
  };

  const toggleCta = (key: string) => {
    setExpandedCtaKey((prev) => (prev === key ? null : key));
    setCtaError(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agents</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">{agent.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review recommended actions across all projects. Categories match your five CTA types,
          grouped for this agent.
        </p>
      </div>

      {actionNotice ? (
        <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
          {actionNotice}
        </div>
      ) : null}
      {ctaError ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {ctaError}
        </div>
      ) : null}
      {loadError ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {loadError}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading actions across projects…
        </div>
      ) : (
        <section className="glass-card rounded-xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Categories</p>
          </div>

          {agentCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories configured.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {agentCategories.map((config) => {
                const stats = buildCategoryStats(aggregatedItems, config.schemaCategory);
                const actions = aggregatedItems.filter(
                  (item) => normalizeCtaCategory(item.cta.category) === config.schemaCategory
                );
                const expanded = expandedCategoryId === config.id;

                return (
                  <Fragment key={config.id}>
                    <button
                      type="button"
                      onClick={() => toggleCategory(config)}
                      className="flex w-full items-center justify-between gap-4 rounded-lg border border-border/50 bg-background/70 px-4 py-3 text-left transition-colors hover:bg-black/2"
                    >
                      <p className="text-sm font-semibold text-foreground">{config.label}</p>
                      <div className="shrink-0 text-right text-[11px] leading-snug text-muted-foreground">
                        <p>
                          <span className="font-semibold text-foreground">{stats.pendingActions}</span>{" "}
                          action{stats.pendingActions === 1 ? "" : "s"} pending
                        </p>
                        <p>
                          <span className="font-semibold text-foreground">{stats.projectCount}</span>{" "}
                          project{stats.projectCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </button>

                    {expanded ? (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                        {actions.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No actions in this category across your projects.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                            {actions.map((item) => {
                              const key = ctaKey(item.sessionId, item.cta.cta_id);
                              const ctaExpanded = expandedCtaKey === key;
                              const completed =
                                item.cta.status === "Executed" ||
                                item.cta.status === "Dismissed";

                              return (
                                <Fragment key={key}>
                                  <button
                                    type="button"
                                    onClick={() => toggleCta(key)}
                                    className="rounded-lg border border-border/50 bg-background/70 px-4 py-3 text-left transition-colors hover:bg-black/2"
                                  >
                                    <p className="text-[10px] font-medium uppercase tracking-wide text-primary">
                                      {item.projectTitle}
                                    </p>
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                      <p className="line-clamp-1 text-sm font-semibold text-foreground">
                                        {item.cta.title}
                                      </p>
                                      <span
                                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${priorityClass(
                                          item.cta.priority
                                        )}`}
                                      >
                                        {item.cta.priority}
                                      </span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                                      <span className={completed ? "font-medium text-success" : ""}>
                                        {statusLabel(item.cta.status)}
                                      </span>
                                      <span className="inline-flex items-center gap-1">
                                        {ctaExpanded ? (
                                          <>
                                            Collapse
                                            <ChevronUp className="h-3.5 w-3.5" />
                                          </>
                                        ) : (
                                          <>
                                            Expand
                                            <ChevronDown className="h-3.5 w-3.5" />
                                          </>
                                        )}
                                      </span>
                                    </div>
                                  </button>

                                  {ctaExpanded ? (
                                    <div className="rounded-md border border-border/40 bg-background/60 px-4 py-3 md:col-span-3">
                                      <p className="text-xs text-muted-foreground">{item.cta.description}</p>
                                      <p className="mt-2 text-xs font-medium text-foreground">Impact</p>
                                      <p className="text-xs text-muted-foreground">{item.cta.impact}</p>
                                      <p className="mt-2 text-xs font-medium text-foreground">
                                        Action when approved
                                      </p>
                                      <ul className="mt-1 space-y-1 pl-4 text-xs text-muted-foreground">
                                        {(item.cta.action_when_approved ?? []).map((step, index) => (
                                          <li
                                            key={`${key}-step-${index}`}
                                            className="list-disc"
                                          >
                                            {step}
                                          </li>
                                        ))}
                                      </ul>
                                      {(item.cta.jira_actions?.length ?? 0) > 0 ? (
                                        <p className="mt-2 text-[11px] text-muted-foreground">
                                          {item.cta.jira_actions!.length} Jira operation
                                          {item.cta.jira_actions!.length === 1 ? "" : "s"} will run on
                                          Accept via TPM backend.
                                        </p>
                                      ) : null}
                                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                        <Link
                                          href={`/session?id=${encodeURIComponent(item.sessionId)}`}
                                          className="text-[11px] font-medium text-primary hover:underline"
                                        >
                                          Open project
                                        </Link>
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            disabled={ctaSavingKey === key}
                                            onClick={() =>
                                              void handleCtaDecision(
                                                item.sessionId,
                                                item.cta,
                                                "reject"
                                              )
                                            }
                                            className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-50"
                                          >
                                            <X className="h-3.5 w-3.5" />
                                            Reject
                                          </button>
                                          <button
                                            type="button"
                                            disabled={ctaSavingKey === key || completed}
                                            onClick={() =>
                                              void handleCtaDecision(
                                                item.sessionId,
                                                item.cta,
                                                "approve"
                                              )
                                            }
                                            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-br from-primary to-[#A65A2C] px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                                          >
                                            {ctaSavingKey === key ? (
                                              <>
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                Processing...
                                              </>
                                            ) : (
                                              <>
                                                <Check className="h-3.5 w-3.5" />
                                                Accept
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                </Fragment>
                              );
                            })}
                          </div>
                        )}
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setExpandedCategoryId(null)}
                            className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                          >
                            Collapse category
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </Fragment>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
