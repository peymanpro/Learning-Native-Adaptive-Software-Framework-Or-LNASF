import { chatConfig } from "./config.mjs";
import { normalizeMessage, normalizeUsername } from "./protocol.mjs";

export const CONNECTION_STATUS = Object.freeze({
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  FAILED: "failed",
});

export const initialChatState = {
  status: CONNECTION_STATUS.DISCONNECTED,
  messages: [],
  users: [],
  typingUser: null,
  error: null,
  retryMetrics: null,
};

export function createMessage({ username, message, time, id, isOwn = false, type = "message" }) {
  const content = normalizeMessage(message);
  if (!content) return null;

  const normalizedUsername = normalizeUsername(username);
  const safeId = typeof id === "string" && id.length > 0 && id.length <= 128
    ? id
    : `${type}-${normalizedUsername ?? "system"}-${Date.now()}-${content.slice(0, 24)}`;

  return {
    id: safeId,
    username: normalizedUsername ?? "Unknown participant",
    message: content,
    time: typeof time === "string" && time.length <= 100 ? time : new Date().toISOString(),
    isOwn,
    type,
  };
}

export function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Just now";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function uniqueUsers(users) {
  if (!Array.isArray(users)) return [];
  return [...new Set(users.map(normalizeUsername).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

export function chatReducer(state, action) {
  switch (action.type) {
    case "status":
      return { ...state, status: action.status, error: action.error ?? null };
    case "users":
      return { ...state, users: uniqueUsers(action.users) };
    case "retryMetrics":
      return { ...state, retryMetrics: action.metrics };
    case "typing": {
      const username = normalizeUsername(action.username);
      return { ...state, typingUser: username };
    }
    case "message": {
      if (!action.message || state.messages.some((item) => item.id === action.message.id)) return state;
      const messages = [...state.messages, action.message];
      return { ...state, messages: messages.slice(-chatConfig.maxRetainedMessages) };
    }
    case "reset":
      return { ...initialChatState };
    default:
      return state;
  }
}
