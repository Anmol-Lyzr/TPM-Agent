import assert from "node:assert/strict";
import { formatLyzrUpstreamError, shouldRetryLyzrStatus } from "./lyzr";

const html502 = `<html>
<head><title>502 Bad Gateway</title></head>
<body>
<center><h1>502 Bad Gateway</h1></center>
</body>
</html>`;

assert.equal(
  formatLyzrUpstreamError(502, html502),
  "Lyzr upstream returned 502 Bad Gateway. Please retry in a moment."
);
assert.equal(shouldRetryLyzrStatus(502), true);
assert.equal(shouldRetryLyzrStatus(400), false);

console.log("lyzr tests passed");
