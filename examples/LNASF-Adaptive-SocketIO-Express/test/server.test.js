const test = require("node:test");
const assert = require("node:assert/strict");
const { createChatServer } = require("../server");
const { normalizeMessage, normalizeUsername } = require("../chat-validation");

test("normalizes valid display names and rejects invalid names", () => {
  assert.equal(normalizeUsername("  Ada  "), "Ada");
  assert.equal(normalizeUsername(""), null);
  assert.equal(normalizeUsername("x".repeat(33)), null);
  assert.equal(normalizeUsername(42), null);
});

test("normalizes messages and enforces length and control-character limits", () => {
  assert.equal(normalizeMessage("  hello  "), "hello");
  assert.equal(normalizeMessage("   "), null);
  assert.equal(normalizeMessage("x".repeat(2001)), null);
  assert.equal(normalizeMessage("hello\nworld"), null);
});

test("exposes an HTTP health endpoint without starting a listener on import", async () => {
  const { server, io } = createChatServer({ allowedOrigins: ["http://localhost:3000"], typingMode: "adaptive" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
    const metricsResponse = await fetch(`http://127.0.0.1:${address.port}/lnasf/metrics`);
    assert.equal(metricsResponse.status, 200);
    const metrics = await metricsResponse.json();
    assert.equal(metrics.framework, "LNASF");
    assert.equal(metrics.mode, "adaptive");
  } finally {
    await new Promise((resolve) => io.close(resolve));
  }
});
