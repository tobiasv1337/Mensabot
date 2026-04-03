export type MessageOrigin = "typed" | "voice" | "shortcut";

export type ChatAnalyticsPayload = {
  user_id: string;
  chat_id: string;
  request_id: string;
  message_origin: MessageOrigin;
};

const USER_ID_STORAGE_KEY = "mensabot-analytics-user-id";

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getAnonymousUserId = () => {
  try {
    const existing = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (existing) return existing;
    const created = createId();
    localStorage.setItem(USER_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return createId();
  }
};

export const createChatAnalyticsPayload = (chatId: string, messageOrigin: MessageOrigin): ChatAnalyticsPayload => ({
  user_id: getAnonymousUserId(),
  chat_id: chatId,
  request_id: createId(),
  message_origin: messageOrigin,
});

export const buildQuickLookupHeaders = (chatId: string, messageOrigin: MessageOrigin): Record<string, string> => ({
  "x-mensabot-user-id": getAnonymousUserId(),
  "x-mensabot-chat-id": chatId,
  "x-mensabot-request-id": createId(),
  "x-mensabot-message-origin": messageOrigin,
  "x-mensabot-interaction-kind": "quick_lookup",
});
