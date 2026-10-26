export const MAX_USERNAME_LENGTH = 32;
export const MAX_MESSAGE_LENGTH = 2000;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

export function normalizeUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const username = value.trim();
  if (
    username.length < 1 ||
    username.length > MAX_USERNAME_LENGTH ||
    CONTROL_CHARACTERS.test(username)
  ) {
    return null;
  }
  return username;
}

export function normalizeMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const message = value.trim();
  if (
    message.length < 1 ||
    message.length > MAX_MESSAGE_LENGTH ||
    CONTROL_CHARACTERS.test(message)
  ) {
    return null;
  }
  return message;
}
