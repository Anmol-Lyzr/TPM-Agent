import assert from "node:assert/strict";
import { buildJiraUpdateFields } from "./jiraFields";
import type { IssueTrackerEntry } from "@/types/meetingPayload";

const issue = {
  issue_key: "HM-25",
  issue_type: "Bug",
  summary: "OAuth session expires during lease e-sign on mobile Safari",
  description: "",
  priority: "Critical",
  status: "To Do",
  assignee: "",
  reporter: "",
  sprint: "",
  epic: "",
  labels: [],
  story_points: 0,
  blocked_by: [],
  due_date: "",
  acceptance_criteria: [],
  severity: "Critical",
  module: "",
  root_cause: "",
  steps_to_reproduce: [],
  impact: "",
  workaround: "",
  resolution_plan: "",
  date_opened: "",
  date_resolved: null,
} satisfies IssueTrackerEntry;

async function run() {
  const fields = await buildJiraUpdateFields(issue);
  assert.deepEqual(fields.priority, { name: "Critical" });
  console.log("jiraFields tests passed");
}

void run();
