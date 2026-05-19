import type { MeetingMinutesPayload } from "@/types/meetingPayload";

const MAX_TRANSCRIPT_CHARS = 6000;
const MAX_LIST_ITEMS = 12;

export function buildMeetingContextBlock(params: {
  sessionId: string;
  title?: string;
  transcript?: string;
  payload: MeetingMinutesPayload | null;
}): string {
  const { sessionId, title, transcript, payload } = params;
  const lines: string[] = [
    "--- Meeting data (TPM Agent) ---",
    `Session ID: ${sessionId}`,
  ];

  const metaTitle = title?.trim() || payload?.metadata?.meeting_title?.trim();
  if (metaTitle) lines.push(`Meeting title: ${metaTitle}`);
  if (payload?.metadata?.date) lines.push(`Date: ${payload.metadata.date}`);

  const mom = payload?.minutes_of_meeting;
  if (mom?.purpose?.trim()) lines.push(`Purpose: ${mom.purpose.trim()}`);

  if (mom?.key_decisions?.length) {
    lines.push("", "Key decisions:");
    appendList(
      lines,
      "",
      mom.key_decisions.slice(0, MAX_LIST_ITEMS).map((d) => `${d.decision_id}: ${d.decision}`)
    );
  }

  if (mom?.action_items?.length) {
    lines.push("", "Action items:");
    mom.action_items.slice(0, MAX_LIST_ITEMS).forEach((item) => {
      lines.push(`- ${item.action_id}: ${item.action} (owner: ${item.owner || "—"}, due: ${item.due_date || "—"}, ${item.status})`);
    });
  }

  if (mom?.risks_and_dependencies_summary?.length) {
    appendList(lines, "Risks & dependencies", mom.risks_and_dependencies_summary);
  }

  const milestones = payload?.project_plan?.milestones ?? [];
  if (milestones.length > 0) {
    lines.push("", "Project plan (milestones):");
    milestones.slice(0, 6).forEach((m, i) => {
      lines.push(`${i + 1}. [${m.milestone_id}] ${m.title} | ${m.start_date}–${m.end_date} | owner: ${m.owner || "—"} | ${m.status}`);
    });
    if (milestones.length > 6) lines.push(`… +${milestones.length - 6} more milestones`);
  }

  const issues = payload?.issue_tracker ?? [];
  if (issues.length > 0) {
    lines.push("", "Issues:");
    issues.slice(0, 10).forEach((issue) => {
      lines.push(`- ${issue.issue_key || "—"}: ${issue.summary} (${issue.status})`);
    });
    if (issues.length > 10) lines.push(`… +${issues.length - 10} more issues`);
  }

  const raid = payload?.raid_log;
  if (raid) {
    const raidRows = [
      ...(raid.risks ?? []).map((r) => `[Risk] ${r.description} | owner: ${r.owner || "—"} | ${r.status}`),
      ...(raid.assumptions ?? []).map((a) => `[Assumption] ${a.description} | owner: ${a.owner || "—"} | ${a.status}`),
      ...(raid.issues ?? []).map((i) => `[Issue] ${i.description} | owner: ${i.owner || "—"} | ${i.status}`),
      ...(raid.dependencies ?? []).map((d) => `[Dependency] ${d.description} | owner: ${d.owner || "—"} | ${d.status}`),
    ];
    if (raidRows.length > 0) {
      lines.push("", "RAID log:");
      raidRows.slice(0, 8).forEach((row) => lines.push(`- ${row}`));
      if (raidRows.length > 8) lines.push(`… +${raidRows.length - 8} more RAID entries`);
    }
  }

  if (transcript?.trim()) {
    const trimmed = transcript.trim();
    const excerpt =
      trimmed.length > MAX_TRANSCRIPT_CHARS
        ? `${trimmed.slice(0, MAX_TRANSCRIPT_CHARS)}\n…(transcript truncated)`
        : trimmed;
    lines.push("", "Meeting transcript:", excerpt);
  }

  lines.push("--- End meeting data ---");
  return lines.join("\n");
}

function appendList(lines: string[], label: string, items: string[]) {
  if (!items.length) return;
  if (label) lines.push("", `${label}:`);
  const slice = items.slice(0, MAX_LIST_ITEMS);
  slice.forEach((item) => lines.push(`- ${item}`));
  if (items.length > MAX_LIST_ITEMS) {
    lines.push(`… +${items.length - MAX_LIST_ITEMS} more`);
  }
}
