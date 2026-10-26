import { appendRetainedMessage, MAX_RETAINED_MESSAGES } from "./chatMessageHistory";

test("retains only the newest messages when history exceeds the configured limit", () => {
  const previous = Array.from({ length: MAX_RETAINED_MESSAGES }, (_, index) => ({ id: index }));
  const next = appendRetainedMessage(previous, { id: MAX_RETAINED_MESSAGES });
  expect(next).toHaveLength(MAX_RETAINED_MESSAGES);
  expect(next[0].id).toBe(1);
  expect(next.at(-1).id).toBe(MAX_RETAINED_MESSAGES);
  expect(previous[0].id).toBe(0);
  expect(previous).toHaveLength(MAX_RETAINED_MESSAGES);
});

test("does not allocate a replacement history when the limit is not reached", () => {
  const previous = [{ id: "first" }];
  const next = appendRetainedMessage(previous, { id: "second" });
  expect(next).toEqual([{ id: "first" }, { id: "second" }]);
  expect(next).not.toBe(previous);
});

test("uses the safe default for invalid custom limits", () => {
  const next = appendRetainedMessage([], { id: 1 }, 0);
  expect(next).toEqual([{ id: 1 }]);
  expect(MAX_RETAINED_MESSAGES).toBe(1000);
});
