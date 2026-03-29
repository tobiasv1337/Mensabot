import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Canteen } from "@/shared/api/MensaBotClient";
import { type ChatMode, loadChatMode, saveChatMode } from "./model/chatMode";
import { Chats, Chat as ChatModel, type Chat as ChatSession } from "./model/chatStore";
import type { ChatFilters } from "./model/chatTypes";
import { defaultChatFilters } from "./model/chatTypes";
import { ChatWorkspaceContext } from "./chatWorkspace";

const CHAT_PAGE_SIZE = 10;

const resolveInitialChatId = () => {
  const activeId = Chats.getActiveId();
  if (activeId && Chats.exists(activeId)) return activeId;
  const recent = Chats.listPage(0, 1)[0]?.id;
  if (recent) return recent;
  return null;
};

export const ChatWorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeChatId, setActiveChatId] = useState<string>(() => resolveInitialChatId() ?? "init_pending");
  const [chat, setChat] = useState<ChatSession>(() => {
    if (activeChatId === "init_pending") {
      return new ChatModel("init_pending", [], defaultChatFilters);
    }
    return Chats.getById(activeChatId, true)!;
  });
  const [filters, setFilters] = useState<ChatFilters>(() => chat.filters ?? defaultChatFilters);
  const [menuCanteen, setMenuCanteen] = useState<Canteen | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>(() => loadChatMode());
  const [chatPages, setChatPages] = useState(1);

  useSyncExternalStore(Chats.subscribe, Chats.getVersion, Chats.getVersion);

  const activateChat = useCallback((id: string, options?: { menuCanteen?: Canteen | null }) => {
    const nextChat = Chats.getById(id, true)!;
    setActiveChatId(id);
    setChat(nextChat);
    setFilters(nextChat.filters ?? defaultChatFilters);
    setMenuCanteen(options?.menuCanteen ?? null);
  }, []);

  const initDoneRef = useRef(false);
  useEffect(() => {
    if (activeChatId === "init_pending" && !initDoneRef.current) {
      initDoneRef.current = true;
      const fresh = Chats.create();
      queueMicrotask(() => activateChat(fresh.id));
    }
  }, [activeChatId, activateChat]);

  useEffect(() => {
    Chats.setActiveId(activeChatId);
  }, [activeChatId]);

  useEffect(() => {
    saveChatMode(chatMode);
  }, [chatMode]);

  const updateChatFilters = useCallback(
    (next: ChatFilters) => {
      chat.setFilters(next);
      setFilters(next);
    },
    [chat],
  );

  const recentChats = Chats.listPage(0, chatPages * CHAT_PAGE_SIZE);
  const hasMoreChats = Chats.listPage(recentChats.length, 1).length > 0;

  const loadMoreChats = useCallback(() => {
    if (!hasMoreChats) return;
    setChatPages((prev) => prev + 1);
  }, [hasMoreChats]);

  const startNewChat = useCallback(
    (options?: { preselectedCanteen?: Canteen | null }) => {
      const baseFilters = filters ?? defaultChatFilters;
      const nextFilters: ChatFilters = {
        ...baseFilters,
        canteens: options?.preselectedCanteen
          ? [options.preselectedCanteen]
          : baseFilters.canteens ?? [],
      };
      const targetChat = chat.hasUserMessage || chat.id === "init_pending" ? Chats.create() : chat;
      targetChat.setFilters(nextFilters);
      activateChat(targetChat.id, { menuCanteen: options?.preselectedCanteen ?? null });
    },
    [activateChat, chat, filters],
  );

  const selectChat = useCallback(
    (id: string) => {
      activateChat(id);
    },
    [activateChat],
  );

  const resetActiveChat = useCallback(() => {
    const fresh = Chats.create();
    activateChat(fresh.id);
  }, [activateChat]);

  const deleteAllChats = useCallback(() => {
    Chats.deleteAll();
    setChatPages(1);
    resetActiveChat();
  }, [resetActiveChat]);

  return (
    <ChatWorkspaceContext.Provider
      value={{
        activeChatId,
        chat,
        filters,
        menuCanteen,
        chatMode,
        recentChats,
        hasMoreChats,
        loadMoreChats,
        setChatMode,
        updateChatFilters,
        startNewChat,
        selectChat,
        activateChat,
        resetActiveChat,
        deleteAllChats,
      }}
    >
      {children}
    </ChatWorkspaceContext.Provider>
  );
};
