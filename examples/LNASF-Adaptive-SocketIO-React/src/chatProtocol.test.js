import { normalizeMessage, normalizeUsername } from "./chatProtocol";

test("normalizes display names and rejects invalid values", () => {
  expect(normalizeUsername("  Ada  ")).toBe("Ada");
  expect(normalizeUsername("")).toBeNull();
  expect(normalizeUsername("x".repeat(33))).toBeNull();
  expect(normalizeUsername("Ada\nAdmin")).toBeNull();
});

test("validates message boundaries and permits multiline chat", () => {
  expect(normalizeMessage("  Hello  ")).toBe("Hello");
  expect(normalizeMessage("   ")).toBeNull();
  expect(normalizeMessage("x".repeat(2001))).toBeNull();
  expect(normalizeMessage("first line\nsecond line")).toBe("first line\nsecond line");
  expect(normalizeMessage("bad\u0001payload")).toBeNull();
});
