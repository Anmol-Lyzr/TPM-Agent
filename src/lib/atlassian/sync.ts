import type { MeetingMinutesPayload } from "@/types/meetingPayload";
import {
  createConfluencePage,
  fetchAtlassianStatus,
  fetchJiraIssues,
  getConfluencePage,
  getIssueTransitions,
  transitionJiraIssue,
  updateConfluencePage,
  updateJiraIssue,
  type AtlassianStatus,
} from "@/lib/atlassian/client";
import {
  buildJiraUpdateFields,
  issueHasSyncableFields,
} from "@/lib/atlassian/jiraFields";

import { isValidJiraIssueKey } from "@/lib/atlassian/jiraFields";

export type AtlassianSyncTrigger = "user_edit" | "agent_refine" | "agent_analyze";

export interface AtlassianSyncResult {
  ok: boolean;
  configured: boolean;
  skipped: boolean;
  trigger: AtlassianSyncTrigger;
  jira: {
    updated: string[];
    failed: Array<{ issueKey: string; error: string }>;
  };
  confluence: {
    pageId?: string;
    action?: "created" | "updated";
    error?: string;
  };
  errors: string[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export { textToAdf } from "@/lib/atlassian/jiraAdf";


async function syncIssueStatus(issueKey: string, statusName: string): Promise<void> {
  const target = statusName.trim();
  if (!target) return;
  const transitions = await getIssueTransitions(issueKey);
  const match = transitions.transitions?.find(
    (t) => t.name.toLowerCase() === target.toLowerCase()
  );
  if (!match?.id) {
    throw new Error(`No Jira transition "${target}" for ${issueKey}`);
  }
  await transitionJiraIssue(issueKey, match.id);
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function hasProjectPrefix(issueKey: string, projectKey?: string): boolean {
  if (!projectKey?.trim()) return false;
  return issueKey.trim().toUpperCase().startsWith(`${projectKey.trim().toUpperCase()}-`);
}

function needsJiraKeyResolution(issueKey: string, projectKey?: string): boolean {
  return Boolean(issueKey.trim() && projectKey?.trim() && !hasProjectPrefix(issueKey, projectKey));
}

async function buildRealJiraKeyBySummary(projectKey: string): Promise<Map<string, string>> {
  const data = await fetchJiraIssues(`project = ${projectKey} ORDER BY created DESC`);
  const map = new Map<string, string>();
  for (const issue of data.issues ?? []) {
    const summary = normalizeText(issue.fields?.summary);
    const key = issue.key?.trim();
    if (summary && key) map.set(summary, key);
  }
  return map;
}

function resolveRealIssueKey(
  generatedIssueKey: string,
  summary: string,
  projectKey: string | undefined,
  realKeyBySummary: Map<string, string> | undefined
): string {
  if (!needsJiraKeyResolution(generatedIssueKey, projectKey)) return generatedIssueKey;
  const realKey = realKeyBySummary?.get(normalizeText(summary));
  if (realKey) {
    console.info(`[jira-sync] resolved issue_key ${generatedIssueKey} → ${realKey}`);
    return realKey;
  }
  throw new Error(
    `Could not resolve generated issue key ${generatedIssueKey} to a real Jira key in project ${projectKey}. ` +
      "Check that the Jira issue exists and its summary still matches the Issue Tracker row."
  );
}

export function buildConfluenceHtml(payload: MeetingMinutesPayload): string {
  const meta = payload.metadata;
  const mom = payload.minutes_of_meeting;
  const title = meta?.meeting_title?.trim() || "Meeting minutes";
  const sections: string[] = [
    `<h1>${escapeHtml(title)}</h1>`,
    `<p><strong>Date:</strong> ${escapeHtml(meta?.date ?? "—")} · <strong>Sprint:</strong> ${escapeHtml(meta?.sprint ?? "—")}</p>`,
  ];

  if (mom?.purpose?.trim()) {
    sections.push(`<h2>Purpose</h2><p>${escapeHtml(mom.purpose.trim())}</p>`);
  }

  if (mom?.key_decisions?.length) {
    sections.push("<h2>Key decisions</h2><ul>");
    for (const d of mom.key_decisions) {
      sections.push(
        `<li><strong>${escapeHtml(d.decision_id)}</strong> — ${escapeHtml(d.decision)} (${escapeHtml(d.decided_by)})</li>`
      );
    }
    sections.push("</ul>");
  }

  if (mom?.action_items?.length) {
    sections.push("<h2>Action items</h2><ul>");
    for (const a of mom.action_items) {
      sections.push(
        `<li><strong>${escapeHtml(a.action_id)}</strong> — ${escapeHtml(a.action)} · Owner: ${escapeHtml(a.owner)} · Due: ${escapeHtml(a.due_date)} · ${escapeHtml(a.status)}</li>`
      );
    }
    sections.push("</ul>");
  }

  if (mom?.discussion_highlights?.length) {
    sections.push("<h2>Discussion highlights</h2>");
    for (const h of mom.discussion_highlights) {
      sections.push(
        `<h3>${escapeHtml(h.topic)}</h3><p>${escapeHtml(h.summary)}</p>`
      );
    }
  }

  if (mom?.risks_and_dependencies_summary?.length) {
    sections.push("<h2>Risks &amp; dependencies</h2><ul>");
    for (const r of mom.risks_and_dependencies_summary) {
      sections.push(`<li>${escapeHtml(r)}</li>`);
    }
    sections.push("</ul>");
  }

  if (mom?.next_milestones?.length) {
    sections.push("<h2>Next milestones</h2><ul>");
    for (const m of mom.next_milestones) {
      sections.push(
        `<li>${escapeHtml(m.milestone)} — ${escapeHtml(m.target_date)}</li>`
      );
    }
    sections.push("</ul>");
  }

  if (payload.issue_tracker?.length) {
    sections.push("<h2>Issue tracker snapshot</h2><ul>");
    for (const issue of payload.issue_tracker) {
      sections.push(
        `<li><strong>${escapeHtml(issue.issue_key)}</strong> [${escapeHtml(issue.issue_type)}] ${escapeHtml(issue.summary)} — ${escapeHtml(issue.status)} (${escapeHtml(issue.priority)})</li>`
      );
    }
    sections.push("</ul>");
  }

  return sections.join("\n");
}

async function syncJiraIssues(
  payload: MeetingMinutesPayload,
  onlyKeys?: string[],
  status?: AtlassianStatus
): Promise<{
  updated: string[];
  failed: Array<{ issueKey: string; error: string }>;
}> {
  const updated: string[] = [];
  const failed: Array<{ issueKey: string; error: string }> = [];
  const keyFilter = onlyKeys?.length
    ? new Set(onlyKeys.map((k) => k.trim()).filter(Boolean))
    : null;
  const issues = payload.issue_tracker ?? [];
  const projectKey = status?.jiraProjectKey?.trim();
  const needsLookup = issues.some((issue) => {
    const key = issue.issue_key?.trim() ?? "";
    if (!key || (keyFilter && !keyFilter.has(key))) return false;
    return needsJiraKeyResolution(key, projectKey);
  });
  const realKeyBySummary =
    needsLookup && projectKey ? await buildRealJiraKeyBySummary(projectKey) : undefined;

  for (const issue of issues) {
    const sourceKey = issue.issue_key?.trim() ?? "";
    if (!isValidJiraIssueKey(sourceKey)) continue;
    if (keyFilter && !keyFilter.has(sourceKey)) continue;
    if (!issueHasSyncableFields(issue)) continue;

    try {
      const key = resolveRealIssueKey(sourceKey, issue.summary, projectKey, realKeyBySummary);
      const fields = await buildJiraUpdateFields(issue);
      if (Object.keys(fields).length) {
        await updateJiraIssue(key, { fields });
      }
      if (issue.status?.trim()) {
        await syncIssueStatus(key, issue.status);
      }
      updated.push(key);
    } catch (err) {
      failed.push({
        issueKey: sourceKey,
        error: err instanceof Error ? err.message : "Jira update failed",
      });
    }
  }

  return { updated, failed };
}

async function syncConfluencePage(
  payload: MeetingMinutesPayload,
  existingPageId?: string
): Promise<{ pageId?: string; action?: "created" | "updated"; error?: string }> {
  const title =
    payload.metadata?.meeting_title?.trim() ||
    payload.metadata?.sprint?.trim() ||
    "TPM Meeting Minutes";
  const html = buildConfluenceHtml(payload);
  const body = { representation: "storage" as const, value: html };

  try {
    if (existingPageId?.trim()) {
      const current = await getConfluencePage(existingPageId.trim());
      const nextVersion = (current.version?.number ?? 0) + 1;
      await updateConfluencePage(existingPageId.trim(), {
        title,
        body,
        version: { number: nextVersion },
      });
      return { pageId: existingPageId.trim(), action: "updated" };
    }

    const created = await createConfluencePage({ title, body });
    const pageId = created.id ? String(created.id) : undefined;
    if (!pageId) {
      return { error: "Confluence create succeeded but no page id returned" };
    }
    return { pageId, action: "created" };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Confluence sync failed",
    };
  }
}

/**
 * Push meeting payload changes to Jira (issues) and Confluence (MoM page)
 * via TPM Backend `/api/atlassian/*` routes.
 */
export async function syncMeetingPayloadToAtlassian(
  payload: MeetingMinutesPayload | null,
  options: {
    trigger: AtlassianSyncTrigger;
    confluencePageId?: string;
    /** When set, only push these Jira issue keys (e.g. rows edited in Issue Tracker). */
    syncIssueKeys?: string[];
    /** Skip Confluence update (faster saves from Issue Tracker / CTA). */
    skipConfluence?: boolean;
  }
): Promise<AtlassianSyncResult> {
  const base: AtlassianSyncResult = {
    ok: false,
    configured: false,
    skipped: true,
    trigger: options.trigger,
    jira: { updated: [], failed: [] },
    confluence: {},
    errors: [],
  };

  if (!payload) {
    base.errors.push("No payload to sync");
    return base;
  }

  let status;
  try {
    status = await fetchAtlassianStatus();
  } catch (err) {
    base.errors.push(
      err instanceof Error ? err.message : "Could not reach TPM backend Atlassian API"
    );
    return base;
  }

  base.configured = Boolean(status.configured);
  if (!status.configured) {
    base.errors.push(
      `Atlassian not configured on backend${status.missing?.length ? `: ${status.missing.join(", ")}` : ""}`
    );
    return base;
  }

  base.skipped = false;

  const jiraResult = await syncJiraIssues(payload, options.syncIssueKeys, status);
  base.jira = jiraResult;
  if (jiraResult.failed.length) {
    for (const f of jiraResult.failed) {
      base.errors.push(`${f.issueKey}: ${f.error}`);
    }
  }

  let confluenceResult: AtlassianSyncResult["confluence"] = {};
  if (!options.skipConfluence) {
    confluenceResult = await syncConfluencePage(payload, options.confluencePageId);
    base.confluence = confluenceResult;
    if (confluenceResult.error) {
      base.errors.push(confluenceResult.error);
    }
  }

  const jiraAttempted =
    (options.syncIssueKeys?.length ?? 0) > 0 || (payload.issue_tracker?.length ?? 0) > 0;

  base.ok =
    base.errors.length === 0 &&
    (jiraResult.updated.length > 0 || Boolean(confluenceResult.pageId));

  if (
    !base.ok &&
    jiraResult.updated.length === 0 &&
    jiraResult.failed.length === 0 &&
    !confluenceResult.pageId &&
    !confluenceResult.error
  ) {
    base.skipped = true;
    if (options.syncIssueKeys?.length) {
      base.errors.push(
        `No Jira updates sent. Check issue keys (${options.syncIssueKeys.join(", ")}) match Jira format like HMC-403.`
      );
    } else if (!jiraAttempted) {
      base.errors.push("Nothing to sync (no valid Jira keys in issue tracker)");
    } else {
      base.errors.push("Nothing to sync (no valid Jira keys or Confluence content)");
    }
  }

  return base;
}
