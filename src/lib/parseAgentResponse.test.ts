import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseAgentResponse } from "./agent/pipeline";

const MEETING_JSON = readFileSync(
  join(import.meta.dirname, "agent/meetingPayload.fixture.json"),
  "utf8"
);

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
assert(
  parsed.issues.length === 0,
  "Issue tracker excludes Jira Task rows; fixture tasks stay in raw JIRA section only"
);
assert(
  parsed.sections.jira.includes("SCRUM-3"),
  "raw JIRA section still contains task list markdown"
);
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
assert(alt.projectPlan.length >= 1, "alt: project plan from Smartsheet (Project Plan)");
assert(
  alt.projectPlan.some((r) => r.taskDesc.includes("Alt plan task") || r.taskName?.includes("Alt plan")),
  "alt: includes parsed plan task row"
);
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
  phaseParsed.projectPlan.some((r) => r.isMilestone),
  "infers milestone from agent phase header without Milestone: prefix"
);

const SMARTSHEET_TASK_LIST = `3. Smartsheet task list

| WBS ID | Task Name | Start Date | End Date | Duration (Days) | Owner |
| --- | --- | --- | --- | --- | --- |
| 1.1 | Requirements | 20 May 2026 | 23 May 2026 | 3 | James Rivera |
`;

const smartsheetListParsed = parseAgentResponse(SMARTSHEET_TASK_LIST);
assert(
  smartsheetListParsed.projectPlan.length >= 1,
  "Smartsheet task list routes to project plan, not issue tracker"
);
assert(
  smartsheetListParsed.issues.length === 0,
  "project plan rows must not appear as Jira issues"
);
const requirementsRow = smartsheetListParsed.projectPlan.find(
  (r) => r.wbsId === "1.1"
);
assert(
  requirementsRow?.duration === "3",
  "parses Duration (Days) column"
);

const DURATION_DAYS = parseAgentResponse(`3. Smartsheet — Project plan

| Task Desc | Start | End | Duration (Auto calc) | Owner |
| --- | --- | --- | --- | --- |
| 1 Complete the RPT Tracker | 15 May 2026 | 18 May 2026 | 3 days | Monisha |
`);
assert(
  DURATION_DAYS.projectPlan[0]?.duration === "3",
  "normalizes duration values like '3 days'"
);

const jsonParsed = parseAgentResponse(MEETING_JSON);
assert(
  jsonParsed.parseMeta.usedStructuredJson,
  "JSON fixture must use structured JSON parse path"
);
assert(
  jsonParsed.meetingMinutes.title === "RPT Tracker Sync",
  "JSON: meeting title from meeting_metadata"
);
assert(
  Boolean(jsonParsed.meetingMinutes.summary?.includes("Weekly sync")),
  "JSON: summary from product_context"
);
assert(
  jsonParsed.meetingMinutes.actionItems.length >= 1,
  "JSON: action items mapped"
);
assert(
  jsonParsed.issues.some((i) => i.key === "SCRUM-99"),
  "JSON: jira_issues mapped to issue tracker"
);
assert(
  jsonParsed.projectPlan.some((r) => r.isMilestone),
  "JSON: project_plan milestones mapped"
);
const jsonMilestone = jsonParsed.projectPlan.find((r) => r.isMilestone);
assert(
  jsonMilestone?.duration === "3",
  "JSON: milestone duration from ISO start/end dates"
);

const OVERALL_AND_MILESTONE = `3. Smartsheet — Project plan

| WBS ID | Task Name | Start Date | End Date | Duration (Days) | Owner |
| --- | --- | --- | --- | --- | --- |
| 0 | Overall Project Timeline | 20 May 2026 | 6 June 2026 | 18 | Sarah Mitchell |
| M1 | MILESTONE: Product Requirements | 20 May 2026 | 23 May 2026 | 3 | James Rivera |
| 1.1.1 | Finalize requirements | 20 May 2026 | 21 May 2026 | 1 | James Rivera |
`;

const overallParsed = parseAgentResponse(OVERALL_AND_MILESTONE);
assert(
  overallParsed.projectPlan.some((r) => r.wbsId === "0"),
  "parses WBS 0 overall project timeline row"
);
const overallMilestone = overallParsed.projectPlan.find((r) => r.isMilestone);
assert(
  overallMilestone?.duration === "3",
  "milestone duration preserved from Smartsheet table"
);
assert(
  jsonParsed.raidLog.some((r) => r.category === "Risk"),
  "JSON: raid_log risks mapped"
);
assert(
  jsonParsed.raidLog.some((r) => r.category === "Assumption"),
  "JSON: raid_log assumptions mapped to open questions / RAID"
);
assert(
  Boolean(jsonParsed.extra.product_context),
  "JSON: preserves product_context in extra"
);

console.log("parseAgentResponse: all tests passed");
