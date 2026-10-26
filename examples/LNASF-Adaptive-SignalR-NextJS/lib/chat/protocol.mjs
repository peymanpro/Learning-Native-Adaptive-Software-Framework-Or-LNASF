import { chatConfig } from "./config.mjs";

const USER_CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;
const MESSAGE_CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export function normalizeUsername(value) {
  if (typeof value !== "string") return null;
  const username = value.trim();
  if (!username || username.length > chatConfig.maxUsernameLength || USER_CONTROL_CHARACTERS.test(username)) return null;
  return username;
}

export function normalizeMessage(value) {
  if (typeof value !== "string") return null;
  const message = value.trim();
  if (!message || message.length > chatConfig.maxMessageLength || MESSAGE_CONTROL_CHARACTERS.test(message)) return null;
  return message;
}
