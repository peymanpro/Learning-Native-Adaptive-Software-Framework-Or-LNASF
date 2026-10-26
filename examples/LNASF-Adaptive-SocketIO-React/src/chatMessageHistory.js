export const MAX_RETAINED_MESSAGES = 1000;

export function appendRetainedMessage(previous, message, limit = MAX_RETAINED_MESSAGES) {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : MAX_RETAINED_MESSAGES;
  const next = [...previous, message];
  return next.length > safeLimit ? next.slice(-safeLimit) : next;
}
