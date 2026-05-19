import type { ParsedAgentResponse } from "@/types/tpm";

const MAX_TRANSCRIPT_CHARS = 6000;
const MAX_LIST_ITEMS = 12;

export function buildMeetingContextBlock(params: {
  sessionId: string;
  title?: string;
  transcript?: string;
  parsed: ParsedAgentResponse;
}): string {
  const { sessionId, title, transcript, parsed } = params;
  const lines: string[] = [
    "--- Meeting data (TPM Agent) ---",
    `Session ID: ${sessionId}`,
  ];

  if (title?.trim()) lines.push(`Meeting title: ${title.trim()}`);

  const mom = parsed.meetingMinutes;
  if (mom.date) lines.push(`Date: ${mom.date}`);
  if (mom.summary?.trim()) lines.push(`Summary: ${mom.summary.trim()}`);
  appendList(lines, "Attendees", mom.attendees);
  appendList(lines, "Decisions", mom.decisions);
  appendList(lines, "Action items", mom.actionItems);
  appendList(lines, "Risks", mom.risks);
  appendList(lines, "Open questions", mom.openQuestions);

  if (parsed.projectPlan.length > 0) {
    lines.push("", "Project plan (sample rows):");
    parsed.projectPlan.slice(0, 8).forEach((row, i) => {
      lines.push(
        `${i + 1}. ${row.taskDesc} | ${row.start}–${row.end} | owner: ${row.owner || "—"}`
      );
    });
    if (parsed.projectPlan.length > 8) {
      lines.push(`… +${parsed.projectPlan.length - 8} more plan rows`);
    }
  }

  if (parsed.issues.length > 0) {
    lines.push("", "Jira / issues:");
    parsed.issues.slice(0, 10).forEach((issue) => {
      lines.push(
        `- ${issue.key || "—"}: ${issue.summary} (${issue.status ?? issue.action})`
      );
    });
    if (parsed.issues.length > 10) {
      lines.push(`… +${parsed.issues.length - 10} more issues`);
    }
  }

  if (parsed.raidLog.length > 0) {
    lines.push("", "RAID log:");
    parsed.raidLog.slice(0, 8).forEach((row) => {
      lines.push(
        `- [${row.category}] ${row.description} | owner: ${row.owner || "—"} | ${row.status}`
      );
    });
    if (parsed.raidLog.length > 8) {
      lines.push(`… +${parsed.raidLog.length - 8} more RAID entries`);
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
  lines.push("", `${label}:`);
  const slice = items.slice(0, MAX_LIST_ITEMS);
  slice.forEach((item) => lines.push(`- ${item}`));
  if (items.length > MAX_LIST_ITEMS) {
    lines.push(`… +${items.length - MAX_LIST_ITEMS} more`);
  }
}
