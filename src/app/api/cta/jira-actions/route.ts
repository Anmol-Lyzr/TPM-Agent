import { NextRequest, NextResponse } from "next/server";
import {
  executeCtaJiraActions,
  resolveCtaJiraActionIssueKeys,
} from "@/lib/atlassian/executeJiraActions";
import { fetchAtlassianStatus, getTpmBackendUrl } from "@/lib/atlassian/client";
import type { CtaJiraAction } from "@/types/jiraActions";
import type { CallToActionEntry, MeetingMinutesPayload } from "@/types/meetingPayload";

export const runtime = "nodejs";

function normalizeJiraActions(raw: unknown): CtaJiraAction[] {
  if (!Array.isArray(raw)) return [];
  return raw as CtaJiraAction[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cta = body.cta as CallToActionEntry | undefined;
    const payload = body.payload as MeetingMinutesPayload | undefined;
    const actions = normalizeJiraActions(cta?.jira_actions ?? body.jira_actions);

    console.info(
      `[cta/jira-actions] cta_id=${cta?.cta_id ?? "—"} jira_actions=${actions.length} tpm_backend=${getTpmBackendUrl()}`
    );

    if (!actions.length) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: "No jira_actions to execute",
        steps: [],
        errors: [],
      });
    }

    const status = await fetchAtlassianStatus();
    if (!status.configured) {
      const error = `Atlassian not configured on TPM backend (${getTpmBackendUrl()})${status.missing?.length ? `: ${status.missing.join(", ")}` : ""}`;
      console.error(`[cta/jira-actions] 503 — ${error}`);
      return NextResponse.json(
        {
          ok: false,
          error,
          tpm_backend_url: getTpmBackendUrl(),
          steps: [],
          errors: [error],
        },
        { status: 503 }
      );
    }

    const resolvedActions = await resolveCtaJiraActionIssueKeys(actions, {
      payload,
      status,
    });
    const result = await executeCtaJiraActions(resolvedActions);
    console.info(
      `[cta/jira-actions] done cta_id=${cta?.cta_id ?? "—"} ok=${result.ok} steps=${result.steps.length}`
    );

    return NextResponse.json({
      ok: result.ok,
      cta_id: cta?.cta_id,
      steps: result.steps,
      errors: result.errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to execute Jira actions";
    return NextResponse.json({ ok: false, error: message, steps: [], errors: [message] }, { status: 502 });
  }
}
