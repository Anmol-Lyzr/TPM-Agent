import {
  buildRaidLog,
  extractBulletsUnderHeader,
  extractRaidFromTranscript,
  normalizeRaidCategory,
  parseConfluenceRaidLists,
  parseRaidTable,
  raidRowsFromJiraBugs,
} from "./raidLog";
import { extractJiraIssuesFromTranscript } from "./jiraFromTranscript";
import { SAMPLE_BUG_TRANSCRIPT, SAMPLE_TRANSCRIPT } from "./sampleTranscript";
import type { MeetingMinutes } from "@/types/tpm";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(normalizeRaidCategory("RISK") === "Risk", "risk alias");
assert(normalizeRaidCategory("Dependencies") === "Dependency", "dependency alias");
assert(normalizeRaidCategory("blocker") === "Issue", "blocker maps to issue");

const table = `| Type | Description | Owner | Impact | Status |
| --- | --- | --- | --- | --- |
| Risk | API outage | TPM | High | Open |
| Assumption | Budget approved | Finance | | Accepted |`;

const rows = parseRaidTable(table);
assert(rows.length === 2, "parses RAID table rows");
assert(rows[0].category === "Risk" && rows[0].impact === "High", "risk fields");

const confluenceSnippet = `Risks / blockers
- Vendor delay

Open questions
- Budget sign-off?`;

const risks = extractBulletsUnderHeader(
  confluenceSnippet,
  /^risks?(?:\s*\/\s*blockers?)?\b/i
);
assert(risks.length === 1 && risks[0].includes("Vendor"), "extract bullets under risks header");

const lists = parseConfluenceRaidLists(confluenceSnippet);
assert(lists.openQuestions.length === 1, "parse open questions list");

const mom: MeetingMinutes = {
  attendees: [],
  decisions: [],
  actionItems: [],
  risks: ["Vendor delay on hardware"],
  openQuestions: [],
};

const narrative = `Assumptions
- Team capacity is fixed for Q2

Dependencies
- Design sign-off before build`;

const merged = buildRaidLog("", narrative, mom);
assert(
  merged.some((r) => r.category === "Risk" && r.description.includes("Vendor")),
  "MoM risks become RAID risks"
);
assert(
  merged.some((r) => r.category === "Assumption"),
  "narrative assumptions parsed"
);
assert(
  merged.some((r) => r.category === "Dependency"),
  "narrative dependencies parsed"
);

const fromSample = extractRaidFromTranscript(SAMPLE_TRANSCRIPT);
assert(
  fromSample.some(
    (r) =>
      r.category === "Risk" &&
      /lease database|garrison|specialist adoption/i.test(r.description)
  ),
  "HMC sample transcript risks / blockers"
);
assert(
  fromSample.some(
    (r) => r.category === "Issue" && r.description.includes("HMC-403")
  ),
  "HMC sample transcript defect as RAID issue"
);
assert(
  fromSample.some((r) => r.category === "Dependency"),
  "HMC sample transcript dependencies"
);
assert(fromSample.length >= 4, "HMC sample transcript yields multiple RAID rows");

const bugIssues = extractJiraIssuesFromTranscript(SAMPLE_BUG_TRANSCRIPT);
const bugRaid = buildRaidLog("", "", { attendees: [], decisions: [], actionItems: [], risks: [], openQuestions: [] }, SAMPLE_BUG_TRANSCRIPT, bugIssues);
assert(bugIssues.length === 11, "bug transcript yields 11 jira bugs");
assert(bugRaid.length >= 11, `bug transcript yields RAID rows, got ${bugRaid.length}`);
assert(
  bugRaid.some((r) => r.category === "Risk" && r.description.includes("SCRUM-210")),
  "critical bug also appears as RAID risk"
);
assert(
  raidRowsFromJiraBugs(bugIssues).some((r) => r.category === "Issue"),
  "jira bugs map to RAID issues"
);

console.log("raidLog.test.ts: all assertions passed");
