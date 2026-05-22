import { getSession, upsertSession } from "@/lib/db/sessions";
import {
  syncMeetingPayloadToAtlassian,
  type AtlassianSyncResult,
  type AtlassianSyncTrigger,
} from "@/lib/atlassian/sync";
import type { MeetingMinutesPayload } from "@/types/meetingPayload";

/**
 * Sync payload to Jira/Confluence via TPM backend, then persist Confluence page id on session.
 */
export async function runSessionAtlassianSync(
  sessionId: string,
  payload: MeetingMinutesPayload | null,
  trigger: AtlassianSyncTrigger,
  options?: {
    confluencePageId?: string;
    syncIssueKeys?: string[];
    skipConfluence?: boolean;
  }
): Promise<AtlassianSyncResult> {
  const storedPageId =
    options?.confluencePageId ?? (await getSession(sessionId))?.confluencePageId;

  const result = await syncMeetingPayloadToAtlassian(payload, {
    trigger,
    confluencePageId: storedPageId,
    syncIssueKeys: options?.syncIssueKeys,
    skipConfluence: options?.skipConfluence,
  });

  const newPageId = result.confluence.pageId;
  if (newPageId && newPageId !== storedPageId) {
    await upsertSession(sessionId, {
      payload,
      confluencePageId: newPageId,
    });
  }

  return result;
}
