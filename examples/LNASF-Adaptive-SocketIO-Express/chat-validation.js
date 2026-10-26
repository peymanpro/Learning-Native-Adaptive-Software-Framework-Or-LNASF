const MAX_USERNAME_LENGTH = 32;
const MAX_MESSAGE_LENGTH = 2000;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

function normalizeUsername(value) {
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

function normalizeMessage(value) {
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

module.exports = {
  MAX_MESSAGE_LENGTH,
  MAX_USERNAME_LENGTH,
  normalizeMessage,
  normalizeUsername,
};
