export type ChatMode = "reliable" | "fast";

const CHAT_MODE_STORAGE_KEY = "mensabot-chat-mode";

export const DEFAULT_CHAT_MODE: ChatMode = "reliable";

export const isJudgeCorrectionEnabled = (mode: ChatMode) => mode === "reliable";

export const loadChatMode = (): ChatMode => {
  try {
    const value = localStorage.getItem(CHAT_MODE_STORAGE_KEY);
    return value === "fast" || value === "reliable" ? value : DEFAULT_CHAT_MODE;
  } catch {
    return DEFAULT_CHAT_MODE;
  }
};

export const saveChatMode = (mode: ChatMode) => {
  try {
    localStorage.setItem(CHAT_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures and keep the in-memory preference.
  }
};
