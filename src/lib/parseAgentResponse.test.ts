import { parseAgentResponse } from "./agent/pipeline";

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
  parsed.meetingMinutes.decisions.length >= 2,
  "MoM must parse decisions from Confluence section"
);
assert(
  parsed.meetingMinutes.actionItems.length >= 2,
  "MoM must parse action items from Confluence section"
);
assert(
  Boolean(parsed.meetingMinutes.summary?.includes("Weekly sync")),
  "MoM must parse summary paragraph"
);
assert(
  !parsed.projectPlan.some((r) => r.taskDesc.includes("Add comment to SCRUM-3")),
  "Project plan must not contain MoM action items"
);
assert(
  parsed.raidLog.some((r) => r.category === "Risk"),
  "RAID log must include risks from MoM narrative"
);
assert(
  parsed.raidLog.some((r) => r.category === "Assumption"),
  "RAID log must include open questions as assumptions"
);
assert(parsed.raidLog.length >= 2, "RAID log must have risk + open question from fixture");
assert(
  !parsed.sections.raid.includes("Weekly sync"),
  "RAID section must not be full MoM body"
);

const ALT_HEADERS = `## 1. Confluence — Meeting summary

**RPT Tracker Sync**

Summary
Alt-format weekly sync.

Decisions
- Decision A

## 2. JIRA — Issue tracker

| Issue Type | Key | Summary | Status |
| --- | --- | --- | --- |
| Bug | SCRUM-99 | Alt bug row | Open |

## 3. Smartsheet (Project Plan)

| Task Desc | Start | End | Owner |
| --- | --- | --- | --- |
| 1 Alt plan task | 1 Jun | 2 Jun | Owner |

## 4. RAID — RAID log

| Type | Description | Owner | Impact | Probability | Status | Mitigation | Target date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Risk | Alt RAID risk | PM | High | Medium | Open | Monitor | 1 Jun |
`;

const alt = parseAgentResponse(ALT_HEADERS);
assert(alt.projectPlan.length === 1, "alt: project plan from Smartsheet (Project Plan)");
assert(alt.issues.some((i) => i.key === "SCRUM-99"), "alt: JIRA issue tracker section");
assert(alt.raidLog.some((r) => r.description.includes("Alt RAID")), "alt: RAID table");
assert(alt.meetingMinutes.summary?.includes("Alt-format"), "alt: MoM summary");

const MILESTONE_TABLE = `3. Smartsheet — Project plan

| Task Desc | Start | End | Duration | Owner |
| --- | --- | --- | --- | --- |
| **Milestone: Product Requirements & Discovery** | 20 May 2026 | 23 May 2026 | | James Rivera |
| Finalize requirements v1.0 | 20 May 2026 | 21 May 2026 | 1 | James Rivera |
`;

const milestoneParsed = parseAgentResponse(MILESTONE_TABLE);
assert(
  milestoneParsed.projectPlan.some((r) => r.isMilestone),
  "parses milestone rows from Smartsheet table"
);
assert(
  milestoneParsed.projectPlan.filter((r) => !r.isMilestone).length >= 1,
  "parses task rows alongside milestones"
);

const AGENT_PHASE_PLAN = `3. Smartsheet — Project plan

| Task Desc | Start | End | Duration | Owner | Dependency/ Predecessor | Comments |
| --- | --- | --- | --- | --- | --- | --- |
| Product Requirements & Discovery | 20 May 2026 | 23 May 2026 | 3 | James Rivera | | |
| Finalize Resident Connect product requirements v1.0 | 20 May 2026 | 21 May 2026 | 1 | James Rivera | 1.1.1 | |
| Define Digital Move-In module scope | 20 May 2026 | 21 May 2026 | 1 | James Rivera | 1.1.2 | |
`;

const phaseParsed = parseAgentResponse(AGENT_PHASE_PLAN);
assert(
  phaseParsed.projectPlan[0]?.isMilestone === true,
  "infers milestone from agent phase header without Milestone: prefix"
);

console.log("parseAgentResponse: all tests passed");
