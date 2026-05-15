import { parseAgentResponse } from "./parseAgentResponse";

const STUDIO_FIXTURE = `1. Confluence — Meeting summary

RPT Tracker & Bug Prioritization Sync

Date / attendees
- Date: Thursday, 15 May 2026
- Attendees:
  - Monisha Anandaraj
  - Anmol Varshney

Summary
Weekly sync on the RPT tracker and Excel bug list.

Decisions
- SCRUM-3 remains To Do
- SCRUM-5 due 21 May 2026

Action items & next steps
1. Add comment to SCRUM-3 — Owner: Monisha Anandaraj
2. Keep SCRUM-5 on track — Due: 21 May 2026 — Priority: Medium
3. Complete the RPT Tracker on Lovable — Start: 15 May, End: 18 May

Risks / blockers
- Reminder agent depends on Lovable tracker

Open questions
- Target dates for Excel bugs?

2. JIRA — Task list (Excel import)

| Issue Type | Key | Summary | Status | Assigned To |
| --- | --- | --- | --- | --- |
| Task | SCRUM-3 | Task 3 | To Do | |
| Task | SCRUM-5 | Complete the RPT Idea | To Do | Monisha Anandaraj |

3. Smartsheet — Project plan

| Task Desc | Start | End | Duration (Auto calc) | Owner |
| --- | --- | --- | --- | --- |
| 1 Complete the RPT Tracker on Lovable | 15 May | 18 May | 3 days | Monisha Anandaraj |
| 2 Complete outstanding bugs on the excel tracker | | | | Monisha Anandaraj |
`;

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const parsed = parseAgentResponse(STUDIO_FIXTURE);

assert(
  parsed.sections.confluence.includes("Action items"),
  "Confluence section must include numbered action items (not split away)"
);
assert(
  parsed.sections.confluence.includes("Add comment to SCRUM-3"),
  "Confluence must contain action item 1"
);
assert(parsed.issues.length >= 2, `Expected JIRA rows, got ${parsed.issues.length}`);
assert(parsed.projectPlan.length >= 2, `Expected plan rows, got ${parsed.projectPlan.length}`);
assert(
  Boolean(parsed.meetingMinutes.rawBody?.includes("Summary")),
  "MoM rawBody must include summary"
);
assert(
  !parsed.projectPlan.some((r) => r.taskDesc.includes("Add comment to SCRUM-3")),
  "Project plan must not contain MoM action items"
);

console.log("parseAgentResponse: all tests passed");
