import { shouldRunJobAtlassianSync } from "./jobOptions";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

assertEqual(
  shouldRunJobAtlassianSync(undefined),
  false,
  "agent jobs should not backend-sync by default"
);
assertEqual(
  shouldRunJobAtlassianSync(false),
  false,
  "explicit false should skip backend sync"
);
assertEqual(
  shouldRunJobAtlassianSync(true),
  true,
  "explicit true should allow backend sync"
);

console.log("jobOptions tests passed");
