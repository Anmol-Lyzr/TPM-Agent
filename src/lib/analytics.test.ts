import {
  computeDashboardAnalytics,
  countDistinctBugKeys,
  isBugIssue,
  sessionHasOutput,
} from "./analytics";
import type { ParsedAgentResponse } from "@/types/tpm";

import { emptyParsed as baseEmptyParsed } from "./constants";

function emptyParsed(): ParsedAgentResponse {
  return baseEmptyParsed;
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// sessionHasOutput
assert(sessionHasOutput(undefined) === false, "undefined parsed has no output");
assert(sessionHasOutput(emptyParsed()) === false, "empty parsed has no output");

const withPlan = emptyParsed();
withPlan.projectPlan = [{ taskDesc: "A", start: "", end: "", duration: "", owner: "", dependency: "", comments: "" }];
assert(sessionHasOutput(withPlan) === true, "plan rows count as output");

const withMomTitle = emptyParsed();
withMomTitle.meetingMinutes.title = "Weekly sync";
assert(sessionHasOutput(withMomTitle) === true, "MoM title counts as output");

// isBugIssue
assert(isBugIssue({ key: "X-1", summary: "x", action: "unknown" }) === false, "no type is not bug");
assert(isBugIssue({ key: "X-1", summary: "x", action: "unknown", issueType: "Task" }) === false, "Task is not bug");
assert(isBugIssue({ key: "X-1", summary: "x", action: "unknown", issueType: "Bug" }) === true, "Bug type matches");
assert(isBugIssue({ key: "X-1", summary: "x", action: "unknown", issueType: "Sub-bug" }) === true, "substring bug matches");

// countDistinctBugKeys
const sessions = [
  {
    parsed: {
      ...emptyParsed(),
      issues: [
        { key: "SCRUM-1", summary: "a", action: "unknown", issueType: "Bug" },
        { key: "SCRUM-1", summary: "dup", action: "unknown", issueType: "Bug" },
        { key: "SCRUM-2", summary: "b", action: "unknown", issueType: "Bug" },
        { key: "SCRUM-3", summary: "c", action: "unknown", issueType: "Task" },
      ],
    },
  },
  {
    parsed: {
      ...emptyParsed(),
      issues: [{ key: "SCRUM-1", summary: "again", action: "unknown", issueType: "Bug" }],
    },
  },
];
assert(countDistinctBugKeys(sessions) === 2, "dedupes bug keys across sessions");

// computeDashboardAnalytics
const analytics = computeDashboardAnalytics([
  { parsed: emptyParsed() },
  { parsed: withPlan },
  {
    parsed: {
      ...emptyParsed(),
      issues: [{ key: "B-1", summary: "bug", action: "unknown", issueType: "Bug" }],
    },
  },
]);
assert(analytics.totalSessions === 3, "totalSessions counts all");
assert(analytics.overallProjects === 2, "two sessions with output");
assert(analytics.completedProjects === 2, "completed matches overall per plan");
assert(analytics.totalBugs === 1, "one distinct bug key");

console.log("analytics.test.ts: all assertions passed");
