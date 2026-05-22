/** Atlassian Document Format helpers for Jira API v3. */

export function textToAdf(text: string): Record<string, unknown> {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => ({
      type: "paragraph",
      content: [{ type: "text", text: block }],
    }));
  if (!paragraphs.length) {
    paragraphs.push({
      type: "paragraph",
      content: [{ type: "text", text: " " }],
    });
  }
  return { type: "doc", version: 1, content: paragraphs };
}
