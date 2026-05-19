import { extractJiraIssuesFromTranscript } from "./jiraFromTranscript";
import { SAMPLE_BUG_TRANSCRIPT } from "./sampleTranscript";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const bugs = extractJiraIssuesFromTranscript(SAMPLE_BUG_TRANSCRIPT);

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
