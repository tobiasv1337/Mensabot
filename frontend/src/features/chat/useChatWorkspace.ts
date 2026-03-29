import { createContext, useContext } from "react";
import type { Canteen } from "@/shared/api/MensaBotClient";
import type { ChatMode } from "../../services/chatMode";
import type { Chat, ChatFilters, ChatSummary } from "../../services/chats";

export type ChatWorkspaceContextValue = {
  activeChatId: string;
  chat: Chat;
  filters: ChatFilters;
  menuCanteen: Canteen | null;
  chatMode: ChatMode;
  recentChats: ChatSummary[];
  hasMoreChats: boolean;
  loadMoreChats: () => void;
  setChatMode: (mode: ChatMode) => void;
  updateChatFilters: (filters: ChatFilters) => void;
  startNewChat: (options?: { preselectedCanteen?: Canteen | null }) => void;
  selectChat: (id: string) => void;
  activateChat: (id: string, options?: { menuCanteen?: Canteen | null }) => void;
  resetActiveChat: () => void;
  deleteAllChats: () => void;
};

export const ChatWorkspaceContext = createContext<ChatWorkspaceContextValue | null>(null);

export const useChatWorkspace = () => {
  const context = useContext(ChatWorkspaceContext);
  if (!context) {
    throw new Error("useChatWorkspace must be used inside ChatWorkspaceProvider");
  }
  return context;
};
