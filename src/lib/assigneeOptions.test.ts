import assert from "node:assert/strict";
import { buildAssigneeOptions } from "./assigneeOptions";

const fromAtlassian = buildAssigneeOptions({
  atlassianUsers: [
    { displayName: "James Rivera", active: true },
    { displayName: "Inactive User", active: false },
    { displayName: "Elena Vasquez", active: true },
    { displayName: " " },
  ],
  fallbackOwners: ["Payload Owner"],
  currentAssignees: ["Current Assignee"],
});

assert.deepEqual(fromAtlassian, [
  "Current Assignee",
  "Elena Vasquez",
  "James Rivera",
]);

const fallback = buildAssigneeOptions({
  atlassianUsers: [],
  fallbackOwners: ["James Rivera", "Elena Vasquez"],
  currentAssignees: ["Current Assignee"],
});

assert.deepEqual(fallback, [
  "Current Assignee",
  "Elena Vasquez",
  "James Rivera",
]);

console.log("assigneeOptions tests passed");
