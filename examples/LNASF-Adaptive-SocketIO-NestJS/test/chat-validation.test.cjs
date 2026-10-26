const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeMessage, normalizeUsername } = require("../dist/chat-validation.js");

test("normalizes display names and rejects invalid values", () => {
  assert.equal(normalizeUsername("  Ada  "), "Ada");
  assert.equal(normalizeUsername(""), null);
  assert.equal(normalizeUsername("x".repeat(33)), null);
  assert.equal(normalizeUsername({ name: "Ada" }), null);
});

test("normalizes messages and enforces content boundaries", () => {
  assert.equal(normalizeMessage("  Hello  "), "Hello");
  assert.equal(normalizeMessage("   "), null);
  assert.equal(normalizeMessage("x".repeat(2001)), null);
  assert.equal(normalizeMessage("line\nbreak"), null);
});
