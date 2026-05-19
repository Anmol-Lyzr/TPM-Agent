import { extractJiraIssuesFromTranscript } from "./jiraFromTranscript";
import { BUG_TRIAGE_TRANSCRIPT } from "./testFixtures/bugTriageTranscript";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const bugs = extractJiraIssuesFromTranscript(BUG_TRIAGE_TRANSCRIPT);

assert(bugs.length === 11, `expected 11 bugs, got ${bugs.length}`);
assert(
  bugs.every((b) => b.issueType === "Bug"),
  "all transcript rows must be Bug type"
);
assert(
  bugs.some((b) => b.key === "SCRUM-203" && b.priority === "Critical"),
  "SCRUM-203 critical bug"
);
assert(
  bugs.some((b) => b.key === "SCRUM-201" && b.summary.includes("CSV")),
  "SCRUM-201 summary"
);

console.log("jiraFromTranscript.test.ts: all assertions passed");
