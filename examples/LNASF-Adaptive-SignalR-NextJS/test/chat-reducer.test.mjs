import test from "node:test";
import assert from "node:assert/strict";
import { chatReducer, CONNECTION_STATUS, createMessage, initialChatState } from "../lib/chat/reducer.mjs";
import { normalizeMessage, normalizeUsername } from "../lib/chat/protocol.mjs";

test("normalizes valid realtime messages and rejects empty payloads", () => {
  assert.equal(createMessage({ username: "A", message: "   " }), null);
  const message = createMessage({ username: "  Ada  ", message: " hello ", time: "2026-01-01T10:00:00.000Z" });
  assert.equal(message.username, "Ada");
  assert.equal(message.message, "hello");
});

test("validates input boundaries and preserves intentional multiline messages", () => {
  assert.equal(normalizeUsername("  Ada  "), "Ada");
  assert.equal(normalizeUsername("x".repeat(33)), null);
  assert.equal(normalizeUsername("Ada\nAdmin"), null);
  assert.equal(normalizeMessage("first line\nsecond line"), "first line\nsecond line");
  assert.equal(normalizeMessage("x".repeat(2001)), null);
  assert.equal(normalizeMessage("bad\u0001payload"), null);
});

test("deduplicates messages and defensively cleans presence data", () => {
  const message = createMessage({ id: "m-1", username: "Ada", message: "Hello" });
  const once = chatReducer(initialChatState, { type: "message", message });
  const twice = chatReducer(once, { type: "message", message });
  assert.equal(twice.messages.length, 1);
  const withUsers = chatReducer(twice, { type: "users", users: ["Ada", " Ada ", null, "Ben", "", "x".repeat(33)] });
  assert.deepEqual(withUsers.users, ["Ada", "Ben"]);
});

test("models connection transitions and resets all session state", () => {
  const connecting = chatReducer(initialChatState, { type: "status", status: CONNECTION_STATUS.CONNECTING });
  const failed = chatReducer(connecting, { type: "status", status: CONNECTION_STATUS.FAILED, error: "Unavailable" });
  assert.equal(failed.status, "failed");
  assert.equal(failed.error, "Unavailable");
  assert.deepEqual(chatReducer(failed, { type: "reset" }), initialChatState);
});

test("caps retained message history to prevent unbounded client state", () => {
  let state = initialChatState;
  for (let i = 0; i < 1100; i += 1) {
    state = chatReducer(state, { type: "message", message: createMessage({ id: String(i), username: "Ada", message: "hi" }) });
  }
  assert.equal(state.messages.length, 1000);
  assert.equal(state.messages[0].id, "100");
});

test("ignores malformed incoming message payloads", () => {
  assert.equal(createMessage({ username: "Ada", message: "x".repeat(2001) }), null);
  assert.equal(createMessage({ username: "x".repeat(33), message: "hello" }).username, "Unknown participant");
});
