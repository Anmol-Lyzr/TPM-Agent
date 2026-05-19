import { formatAgentTextReply } from "./formatAgentText";

// Valid JSON as returned by Lyzr (escaped newlines + unicode)
const fixture = String.raw`{"answer_markdown": "\ud83d\uddf3\ufe0f Key Decisions \u2013 Most Recent Meeting\n\n**Decision 1** \u2014 Ship by Friday\n- Owner: Alex\n- Status: \u2705 Approved"}`;

const out = formatAgentTextReply(fixture);

if (!out.includes("Key Decisions")) {
  throw new Error("expected decoded title in output");
}
if (out.includes("\\ud83d") || out.includes("answer_markdown")) {
  throw new Error("expected JSON/unicode escapes to be resolved");
}
if (!out.includes("Decision 1") || !out.includes("Approved")) {
  throw new Error("expected markdown body in output");
}

const nested = formatAgentTextReply({
  response: fixture,
});

if (!nested.includes("Key Decisions")) {
  throw new Error("expected nested response parsing");
}

console.log("formatAgentText: all tests passed");
