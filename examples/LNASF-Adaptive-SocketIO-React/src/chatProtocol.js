export const MAX_USERNAME_LENGTH = 32;
export const MAX_MESSAGE_LENGTH = 2000;

function hasUnsafeControlCharacters(value, allowMultilineWhitespace) {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code === 0x7f) return true;
    if (code <= 0x1f) {
      if (allowMultilineWhitespace && (code === 0x09 || code === 0x0a || code === 0x0d)) {
        continue;
      }
      return true;
    }
  }
  return false;
}

export function normalizeUsername(value) {
  if (typeof value !== "string") return null;
  const username = value.trim();
  if (!username || username.length > MAX_USERNAME_LENGTH || hasUnsafeControlCharacters(username, false)) return null;
  return username;
}

export function normalizeMessage(value) {
  if (typeof value !== "string") return null;
  const message = value.trim();
  if (!message || message.length > MAX_MESSAGE_LENGTH || hasUnsafeControlCharacters(message, true)) return null;
  return message;
}
