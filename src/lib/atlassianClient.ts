import { apiUrl } from "@/lib/apiBase";

export interface AtlassianStatus {
  configured: boolean;
  missing: string[];
  site: string;
  jiraProjectKey: string;
  jiraBoardId: number;
  confluenceSpaceKey: string;
}

export interface JiraIssue {
  id?: string;
  key: string;
  fields?: {
    summary?: string;
    status?: { name?: string };
    priority?: { name?: string };
    issuetype?: { name?: string };
    assignee?: { displayName?: string } | null;
    updated?: string;
  };
}

export interface JiraIssuesResponse {
  issues?: JiraIssue[];
  total?: number;
}

export interface JiraComment {
  id: string;
  author?: { displayName?: string };
  body?: unknown;
  updated?: string;
}

export interface JiraCommentsResponse {
  comments?: JiraComment[];
}

export interface ConfluencePage {
  id: string;
  title: string;
  status?: string;
  version?: { number?: number };
  body?: {
    storage?: {
      value?: string;
      representation?: string;
    };
  };
}

export interface ConfluencePagesResponse {
  results?: ConfluencePage[];
}

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

function adfText(text: string) {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: text ? [{ type: "text", text }] : [],
      },
    ],
  };
}

export function fetchAtlassianStatus() {
  return jsonRequest<AtlassianStatus>("/api/atlassian/status");
}

export function fetchJiraIssues(jql?: string) {
  const query = jql ? `?jql=${encodeURIComponent(jql)}` : "";
  return jsonRequest<JiraIssuesResponse>(`/api/atlassian/jira/issues${query}`);
}

export function createJiraIssue(params: {
  projectKey: string;
  issueType: string;
  summary: string;
  description: string;
}) {
  return jsonRequest<{ key: string; id: string }>("/api/atlassian/jira/issues", {
    method: "POST",
    body: JSON.stringify({
      fields: {
        project: { key: params.projectKey },
        issuetype: { name: params.issueType },
        summary: params.summary,
        description: adfText(params.description),
      },
    }),
  });
}

export function updateJiraIssue(issueKey: string, params: { summary: string }) {
  return jsonRequest<{ ok: boolean }>(`/api/atlassian/jira/issues/${encodeURIComponent(issueKey)}`, {
    method: "PUT",
    body: JSON.stringify({ fields: { summary: params.summary } }),
  });
}

export function deleteJiraIssue(issueKey: string) {
  return jsonRequest<{ ok: boolean }>(
    `/api/atlassian/jira/issues/${encodeURIComponent(issueKey)}?deleteSubtasks=true`,
    { method: "DELETE" }
  );
}

export function fetchJiraComments(issueKey: string) {
  return jsonRequest<JiraCommentsResponse>(
    `/api/atlassian/jira/issues/${encodeURIComponent(issueKey)}/comments`
  );
}

export function createJiraComment(issueKey: string, text: string) {
  return jsonRequest<JiraComment>(
    `/api/atlassian/jira/issues/${encodeURIComponent(issueKey)}/comments`,
    { method: "POST", body: JSON.stringify({ body: adfText(text) }) }
  );
}

export function updateJiraComment(issueKey: string, commentId: string, text: string) {
  return jsonRequest<JiraComment>(
    `/api/atlassian/jira/issues/${encodeURIComponent(issueKey)}/comments/${encodeURIComponent(commentId)}`,
    { method: "PUT", body: JSON.stringify({ body: adfText(text) }) }
  );
}

export function deleteJiraComment(issueKey: string, commentId: string) {
  return jsonRequest<{ ok: boolean }>(
    `/api/atlassian/jira/issues/${encodeURIComponent(issueKey)}/comments/${encodeURIComponent(commentId)}`,
    { method: "DELETE" }
  );
}

export function fetchConfluencePages() {
  return jsonRequest<ConfluencePagesResponse>("/api/atlassian/confluence/pages");
}

export function fetchConfluencePage(pageId: string) {
  return jsonRequest<ConfluencePage>(`/api/atlassian/confluence/pages/${encodeURIComponent(pageId)}`);
}

export function createConfluencePage(params: { title: string; bodyValue: string }) {
  return jsonRequest<ConfluencePage>("/api/atlassian/confluence/pages", {
    method: "POST",
    body: JSON.stringify({
      status: "current",
      title: params.title,
      body: {
        representation: "storage",
        value: params.bodyValue,
      },
    }),
  });
}

export function updateConfluencePage(page: ConfluencePage, bodyValue: string) {
  const nextVersion = (page.version?.number ?? 1) + 1;
  return jsonRequest<ConfluencePage>(`/api/atlassian/confluence/pages/${encodeURIComponent(page.id)}`, {
    method: "PUT",
    body: JSON.stringify({
      id: page.id,
      status: "current",
      title: page.title,
      body: {
        representation: "storage",
        value: bodyValue,
      },
      version: {
        number: nextVersion,
        message: "Updated from TPM Agent",
      },
    }),
  });
}

export function deleteConfluencePage(pageId: string) {
  return jsonRequest<{ ok: boolean }>(
    `/api/atlassian/confluence/pages/${encodeURIComponent(pageId)}`,
    { method: "DELETE" }
  );
}
