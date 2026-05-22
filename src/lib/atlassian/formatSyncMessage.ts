import type { AtlassianSyncSummary } from "@/lib/sessionStore";

export function formatAtlassianSyncMessage(sync?: AtlassianSyncSummary): string | null {
  if (!sync) return null;
  if (sync.errors.length) return sync.errors.join("; ");
  if (sync.skipped) return null;
  if (sync.ok) {
    const parts: string[] = [];
    if (sync.jira?.updated?.length) {
      parts.push(`Jira updated: ${sync.jira.updated.join(", ")}`);
    }
    if (sync.confluence?.pageId) {
      parts.push(
        `Confluence ${sync.confluence.action ?? "updated"} (page ${sync.confluence.pageId})`
      );
    }
    return parts.length ? parts.join(" · ") : "Saved (no Jira/Confluence changes detected)";
  }
  return "Jira/Confluence sync did not complete";
}
