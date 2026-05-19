import { parseAgentOutput } from "./pipeline";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const jsonReply = JSON.stringify({
  issues: [{ key: "HMC-1", summary: "Test", action: "unknown" }],
  projectPlan: [
    {
      taskDesc: "**Milestone: Phase A**",
      start: "1 Jan",
      end: "2 Jan",
      duration: "",
      owner: "",
      dependency: "",
      comments: "",
    },
  ],
  meetingMinutes: { rawBody: "Summary line", attendees: ["A"] },
});

const { parsed, reply } = parseAgentOutput({ markdown: jsonReply });
assert(reply.length > 0, "reply preserved");
assert(parsed.issues[0]?.key === "HMC-1", "structured JSON issues");
assert(parsed.projectPlan[0]?.isMilestone === true, "structured milestone");
assert(parsed.parseMeta.usedStructuredJson === true, "flags JSON path");

const md = `1. Confluence — Meeting summary

Summary
Hello world.

2. JIRA — Task list

| Key | Summary | Status |
| --- | --- | --- |
| X-1 | Item | Open |

3. Smartsheet — Project plan

| Task Desc | Start | End |
| --- | --- | --- |
| Phase header | 1 Jan | 2 Jan |
| Finalize thing | 1 Jan | 2 Jan |
`;

const mdParsed = parseAgentOutput({ markdown: md }).parsed;
assert(mdParsed.issues.length === 1, "markdown jira");
assert(
  mdParsed.projectPlan.some((r) => r.isMilestone),
  "infers milestone from phase header"
);
assert(mdParsed.sourceMarkdown.includes("Confluence"), "sourceMarkdown stored");

console.log("pipeline.test.ts: all assertions passed");
