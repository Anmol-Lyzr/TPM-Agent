/** HTTP client for TPM Agent Backend Atlassian proxy (localhost:8000). */

const LOG_PREFIX = "[tpm-backend]";

export function getTpmBackendUrl(): string {
  const raw =
    process.env.TPM_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8000";
  return raw.replace(/\/$/, "");
}

function buildBackendUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getTpmBackendUrl()}${normalized}`;
}

function logBackendRequest(method: string, url: string, extra?: string): void {
  console.info(`${LOG_PREFIX} → ${method} ${url}${extra ? ` ${extra}` : ""}`);
}

function logBackendResponse(
  method: string,
  url: string,
  status: number,
  durationMs: number,
  ok: boolean,
  detail?: string
): void {
  const line = `${LOG_PREFIX} ← ${status} ${method} ${url} (${durationMs}ms)`;
  if (ok) {
    console.info(detail ? `${line} — ${detail}` : line);
  } else {
    console.error(detail ? `${line} — ${detail}` : line);
  }
}

export type AtlassianStatus = {
  configured: boolean;
  missing?: string[];
  site?: string;
  jiraProjectKey?: string;
  confluenceSpaceKey?: string;
};

async function backendFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const url = buildBackendUrl(path);
  const started = Date.now();

  logBackendRequest(method, url);

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (err) {
    const durationMs = Date.now() - started;
    const message = err instanceof Error ? err.message : "Network error";
    logBackendResponse(method, url, 0, durationMs, false, `unreachable — ${message}`);
    throw new Error(`TPM backend unreachable (${url}): ${message}`);
  }

  const durationMs = Date.now() - started;

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string; error?: string };
      detail = body.error ?? body.detail ?? detail;
    } catch {
      detail = (await res.text()).slice(0, 500) || detail;
    }
    logBackendResponse(method, url, res.status, durationMs, false, detail);
    throw new Error(`Atlassian API ${res.status}: ${detail}`);
  }

  logBackendResponse(method, url, res.status, durationMs, true);
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

export async function fetchAtlassianStatus(): Promise<AtlassianStatus> {
  return backendFetch<AtlassianStatus>("/api/atlassian/status");
}

export async function updateJiraIssue(
  issueKey: string,
  body: { fields: Record<string, unknown> }
): Promise<{ ok?: boolean }> {
  return backendFetch(`/api/atlassian/jira/issues/${encodeURIComponent(issueKey)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function createJiraIssue(body: {
  fields: Record<string, unknown>;
}): Promise<{ key?: string; id?: string }> {
  return backendFetch("/api/atlassian/jira/issues", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getConfluencePage(pageId: string): Promise<{
  id?: string;
  title?: string;
  version?: { number?: number };
}> {
  return backendFetch(
    `/api/atlassian/confluence/pages/${encodeURIComponent(pageId)}`
  );
}

export async function createConfluencePage(body: {
  title: string;
  body: { representation: string; value: string };
}): Promise<{ id?: string; title?: string; version?: { number?: number } }> {
  return backendFetch("/api/atlassian/confluence/pages", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateConfluencePage(
  pageId: string,
  body: {
    title: string;
    body: { representation: string; value: string };
    version: { number: number };
  }
): Promise<{ id?: string; title?: string }> {
  return backendFetch(
    `/api/atlassian/confluence/pages/${encodeURIComponent(pageId)}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    }
  );
}

export async function searchJiraUsers(
  query: string
): Promise<{ users: Array<{ accountId?: string; displayName?: string }> }> {
  return backendFetch(
    `/api/atlassian/jira/users/search?query=${encodeURIComponent(query)}`
  );
}

export async function getIssueTransitions(
  issueKey: string
): Promise<{ transitions?: Array<{ id: string; name: string }> }> {
  return backendFetch(
    `/api/atlassian/jira/issues/${encodeURIComponent(issueKey)}/transitions`
  );
}

export async function transitionJiraIssue(
  issueKey: string,
  transitionId: string
): Promise<{ ok?: boolean }> {
  return backendFetch(
    `/api/atlassian/jira/issues/${encodeURIComponent(issueKey)}/transitions`,
    {
      method: "POST",
      body: JSON.stringify({ transition: { id: transitionId } }),
    }
  );
}

export async function assignJiraIssue(
  issueKey: string,
  accountId: string
): Promise<{ ok?: boolean }> {
  return backendFetch(
    `/api/atlassian/jira/issues/${encodeURIComponent(issueKey)}/assignee`,
    {
      method: "PUT",
      body: JSON.stringify({ accountId }),
    }
  );
}

export async function createJiraIssueComment(
  issueKey: string,
  body: Record<string, unknown>
): Promise<{ id?: string }> {
  return backendFetch(
    `/api/atlassian/jira/issues/${encodeURIComponent(issueKey)}/comments`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export async function linkJiraIssues(body: {
  type: { name: string };
  inwardIssue: { key: string };
  outwardIssue: { key: string };
}): Promise<unknown> {
  return backendFetch("/api/atlassian/jira/issueLink", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
