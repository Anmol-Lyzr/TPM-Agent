"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  ConfluencePage,
  JiraComment,
  JiraIssue,
  createConfluencePage,
  createJiraComment,
  createJiraIssue,
  deleteConfluencePage,
  deleteJiraComment,
  deleteJiraIssue,
  fetchAtlassianStatus,
  fetchConfluencePage,
  fetchConfluencePages,
  fetchJiraComments,
  fetchJiraIssues,
  updateConfluencePage,
  updateJiraComment,
  updateJiraIssue,
  type AtlassianStatus,
} from "@/lib/atlassianClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TabId = "jira" | "confluence";

function extractPlainText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const node = value as { text?: string; content?: unknown[] };
  const own = typeof node.text === "string" ? node.text : "";
  const children = Array.isArray(node.content)
    ? node.content.map(extractPlainText).filter(Boolean).join(" ")
    : "";
  return [own, children].filter(Boolean).join(" ").trim();
}

function StatePill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        ok ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
      )}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      {children}
    </span>
  );
}

function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return "";
  const document = new DOMParser().parseFromString(html, "text/html");
  document
    .querySelectorAll("script, iframe, object, embed, link, meta, style")
    .forEach((node) => node.remove());
  document.querySelectorAll("*").forEach((node) => {
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (
        name.startsWith("on") ||
        value.startsWith("javascript:") ||
        value.startsWith("data:text/html")
      ) {
        node.removeAttribute(attr.name);
      }
    }
  });
  return document.body.innerHTML;
}

export default function AtlassianToolsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [activeTab, setActiveTab] = useState<TabId>("jira");
  const [status, setStatus] = useState<AtlassianStatus | null>(null);
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [pages, setPages] = useState<ConfluencePage[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<JiraIssue | null>(null);
  const [comments, setComments] = useState<JiraComment[]>([]);
  const [selectedPage, setSelectedPage] = useState<ConfluencePage | null>(null);
  const [pageBody, setPageBody] = useState("");
  const [jql, setJql] = useState("");
  const [newIssueSummary, setNewIssueSummary] = useState("");
  const [newIssueDescription, setNewIssueDescription] = useState("");
  const [newIssueType, setNewIssueType] = useState("Task");
  const [editIssueSummary, setEditIssueSummary] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [editCommentText, setEditCommentText] = useState("");
  const [selectedCommentId, setSelectedCommentId] = useState("");
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageBody, setNewPageBody] = useState("<p>New Confluence document</p>");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectKey = status?.jiraProjectKey ?? "HM";

  const loadAll = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const nextStatus = await fetchAtlassianStatus();
      setStatus(nextStatus);
      if (!nextStatus.configured) {
        setIssues([]);
        setPages([]);
        return;
      }
      const [issueData, pageData] = await Promise.all([
        fetchJiraIssues(jql || undefined),
        fetchConfluencePages(),
      ]);
      setIssues(issueData.issues ?? []);
      setPages(pageData.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Atlassian data");
    } finally {
      setLoading(false);
    }
  }, [jql]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadAll();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadAll]);

  const selectedComment = useMemo(
    () => comments.find((comment) => comment.id === selectedCommentId),
    [comments, selectedCommentId]
  );
  const renderedPageBody = useMemo(() => sanitizeHtml(pageBody), [pageBody]);

  async function runAction(action: () => Promise<void>) {
    setError(null);
    setWorking(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Atlassian action failed");
    } finally {
      setWorking(false);
    }
  }

  async function openIssue(issue: JiraIssue) {
    setSelectedIssue(issue);
    setEditIssueSummary(issue.fields?.summary ?? "");
    setSelectedCommentId("");
    setEditCommentText("");
    const data = await fetchJiraComments(issue.key);
    setComments(data.comments ?? []);
  }

  async function openPage(page: ConfluencePage) {
    const fullPage = await fetchConfluencePage(page.id);
    setSelectedPage(fullPage);
    setPageBody(fullPage.body?.storage?.value ?? "");
  }

  return (
    <div
      className={cn(
        "flex w-full flex-1 flex-col gap-5",
        embedded ? "h-full min-h-0 overflow-auto p-4" : "mx-auto max-w-7xl p-4 md:p-8"
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Atlassian Console</h1>
            {status && (
              <StatePill ok={status.configured}>
                {status.configured ? "Connected" : `Missing ${status.missing.join(", ")}`}
              </StatePill>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Jira project {projectKey}, board {status?.jiraBoardId ?? 67}, and Confluence space{" "}
            {status?.confluenceSpaceKey ?? "SD"} through the FastAPI proxy.
          </p>
        </div>
        <Button onClick={() => void loadAll()} disabled={loading || working} variant="outline" className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex w-fit rounded-lg border border-border/60 bg-black/[0.03] p-1">
        {(["jira", "confluence"] as TabId[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "jira" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
          <section className="glass-card rounded-xl p-4">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                value={jql}
                onChange={(event) => setJql(event.target.value)}
                placeholder={`project = ${projectKey} ORDER BY created DESC`}
                className="glass-input"
              />
              <Button onClick={() => void loadAll()} disabled={loading || working} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Run JQL
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/60 text-muted-foreground">
                  <tr>
                    <th className="p-2 font-medium">Key</th>
                    <th className="p-2 font-medium">Summary</th>
                    <th className="p-2 font-medium">Status</th>
                    <th className="p-2 font-medium">Owner</th>
                    <th className="p-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue) => (
                    <tr key={issue.key} className="border-b border-border/30">
                      <td className="p-2 font-mono text-[11px] text-primary">{issue.key}</td>
                      <td className="max-w-[360px] p-2">{issue.fields?.summary ?? "Untitled"}</td>
                      <td className="p-2">
                        <Badge variant="brand">{issue.fields?.status?.name ?? "Unknown"}</Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {issue.fields?.assignee?.displayName ?? "Unassigned"}
                      </td>
                      <td className="p-2 text-right">
                        <Button size="sm" variant="outline" onClick={() => void runAction(() => openIssue(issue))}>
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="glass-card rounded-xl p-4">
              <div className="mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Create Jira issue</h2>
              </div>
              <div className="space-y-2">
                <Input value={newIssueType} onChange={(event) => setNewIssueType(event.target.value)} placeholder="Task" />
                <Input
                  value={newIssueSummary}
                  onChange={(event) => setNewIssueSummary(event.target.value)}
                  placeholder="Summary"
                />
                <textarea
                  value={newIssueDescription}
                  onChange={(event) => setNewIssueDescription(event.target.value)}
                  placeholder="Description"
                  className="glass-input min-h-24 w-full rounded-md px-3 py-2 text-sm outline-none"
                />
                <Button
                  disabled={working || !newIssueSummary.trim()}
                  onClick={() =>
                    void runAction(async () => {
                      await createJiraIssue({
                        projectKey,
                        issueType: newIssueType || "Task",
                        summary: newIssueSummary.trim(),
                        description: newIssueDescription.trim(),
                      });
                      setNewIssueSummary("");
                      setNewIssueDescription("");
                      await loadAll();
                    })
                  }
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create issue
                </Button>
              </div>
            </section>

            <section className="glass-card rounded-xl p-4">
              <div className="mb-3 flex items-center gap-2">
                <Pencil className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Issue editor</h2>
              </div>
              {selectedIssue ? (
                <div className="space-y-3">
                  <p className="font-mono text-xs text-primary">{selectedIssue.key}</p>
                  <Input value={editIssueSummary} onChange={(event) => setEditIssueSummary(event.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      disabled={working || !editIssueSummary.trim()}
                      onClick={() =>
                        void runAction(async () => {
                          await updateJiraIssue(selectedIssue.key, { summary: editIssueSummary.trim() });
                          await loadAll();
                        })
                      }
                    >
                      Save
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={working}
                      onClick={() =>
                        void runAction(async () => {
                          await deleteJiraIssue(selectedIssue.key);
                          setSelectedIssue(null);
                          setComments([]);
                          await loadAll();
                        })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                  <div className="border-t border-border/40 pt-3">
                    <div className="mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <h3 className="text-xs font-semibold">Comments</h3>
                    </div>
                    <div className="mb-2 max-h-32 space-y-2 overflow-auto">
                      {comments.map((comment) => (
                        <button
                          key={comment.id}
                          onClick={() => {
                            setSelectedCommentId(comment.id);
                            setEditCommentText(extractPlainText(comment.body));
                          }}
                          className={cn(
                            "w-full rounded-md border p-2 text-left text-[11px]",
                            selectedCommentId === comment.id
                              ? "border-primary/40 bg-primary/5"
                              : "border-border/40 bg-black/[0.02]"
                          )}
                        >
                          <span className="font-mono text-primary">#{comment.id}</span>{" "}
                          {extractPlainText(comment.body) || "No text preview"}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={newCommentText}
                      onChange={(event) => setNewCommentText(event.target.value)}
                      placeholder="Add comment"
                      className="glass-input mb-2 min-h-20 w-full rounded-md px-3 py-2 text-sm outline-none"
                    />
                    <Button
                      size="sm"
                      disabled={working || !newCommentText.trim()}
                      onClick={() =>
                        void runAction(async () => {
                          await createJiraComment(selectedIssue.key, newCommentText.trim());
                          setNewCommentText("");
                          await openIssue(selectedIssue);
                        })
                      }
                    >
                      Add comment
                    </Button>
                    {selectedComment && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={editCommentText}
                          onChange={(event) => setEditCommentText(event.target.value)}
                          className="glass-input min-h-20 w-full rounded-md px-3 py-2 text-sm outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            disabled={working}
                            onClick={() =>
                              void runAction(async () => {
                                await updateJiraComment(selectedIssue.key, selectedComment.id, editCommentText);
                                await openIssue(selectedIssue);
                              })
                            }
                          >
                            Update comment
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={working}
                            onClick={() =>
                              void runAction(async () => {
                                await deleteJiraComment(selectedIssue.key, selectedComment.id);
                                setSelectedCommentId("");
                                setEditCommentText("");
                                await openIssue(selectedIssue);
                              })
                            }
                          >
                            Delete comment
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Open an issue to edit it or manage comments.</p>
              )}
            </section>
          </aside>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
          <div className="space-y-4">
            <section className="glass-card rounded-xl p-4">
              <div className="mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Create Confluence document</h2>
              </div>
              <div className="space-y-2">
                <Input
                  value={newPageTitle}
                  onChange={(event) => setNewPageTitle(event.target.value)}
                  placeholder="Document title"
                />
                <textarea
                  value={newPageBody}
                  onChange={(event) => setNewPageBody(event.target.value)}
                  className="glass-input min-h-28 w-full rounded-md px-3 py-2 font-mono text-xs outline-none"
                />
                <Button
                  disabled={working || !newPageTitle.trim()}
                  onClick={() =>
                    void runAction(async () => {
                      const created = await createConfluencePage({
                        title: newPageTitle.trim(),
                        bodyValue: newPageBody,
                      });
                      setSelectedPage(created);
                      setPageBody(created.body?.storage?.value ?? newPageBody);
                      setNewPageTitle("");
                      setNewPageBody("<p>New Confluence document</p>");
                      await loadAll();
                    })
                  }
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create document
                </Button>
              </div>
            </section>

            <section className="glass-card rounded-xl p-4">
              <div className="mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Confluence documents</h2>
              </div>
              <div className="space-y-2">
                {pages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => void runAction(() => openPage(page))}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left text-sm transition-colors",
                      selectedPage?.id === page.id
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/40 bg-black/[0.02] hover:bg-black/[0.04]"
                    )}
                  >
                    <span className="block font-medium text-foreground">{page.title}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">ID {page.id}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <section className="glass-card rounded-xl p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Document editor</h2>
                <p className="text-xs text-muted-foreground">
                  Confluence storage-format HTML is sent through FastAPI.
                </p>
              </div>
              {selectedPage && (
                <Badge variant="brand">v{selectedPage.version?.number ?? 1}</Badge>
              )}
            </div>
            {selectedPage ? (
              <div className="space-y-3">
                <Input
                  value={selectedPage.title}
                  onChange={(event) => setSelectedPage({ ...selectedPage, title: event.target.value })}
                />
                <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">Storage HTML</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{pageBody.length} chars</span>
                    </div>
                    <textarea
                      value={pageBody}
                      onChange={(event) => setPageBody(event.target.value)}
                      className="glass-input min-h-[420px] w-full rounded-md px-3 py-2 font-mono text-xs outline-none"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">Rendered HTML</span>
                      <span className="font-mono text-[10px] text-muted-foreground">preview</span>
                    </div>
                    <div
                      className="confluence-render min-h-[420px] overflow-auto rounded-md border border-border/50 bg-white/70 px-4 py-3 text-sm text-foreground"
                      dangerouslySetInnerHTML={{ __html: renderedPageBody || "<p></p>" }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    disabled={working || !selectedPage.title.trim()}
                    onClick={() =>
                      void runAction(async () => {
                        const updated = await updateConfluencePage(selectedPage, pageBody);
                        setSelectedPage(updated);
                        await loadAll();
                      })
                    }
                  >
                    Save page
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={working}
                    onClick={() =>
                      void runAction(async () => {
                        await deleteConfluencePage(selectedPage.id);
                        setSelectedPage(null);
                        setPageBody("");
                        await loadAll();
                      })
                    }
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete page
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Open a Confluence page to edit or delete it.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
