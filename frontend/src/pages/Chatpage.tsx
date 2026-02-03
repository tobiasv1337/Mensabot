import React, { useCallback, useEffect, useRef, useState } from "react";
import Header from "../components/header/header";
import Sidebar from "../components/sidebar/sidebar";
import type { NavItem } from "../types/navigation";
import * as S from "./Chatpage.styles";
import Chat from "../components/chat/Chat.tsx";
import CanteensPage from "./CanteensPage";
import ShortcutsPage from "./ShortcutsPage";
import SettingsPage from "./SettingsPage";
import type { Canteen } from "../services/api";
import { useShortcuts } from "../services/shortcuts";
import { Chats, type Chat as ChatSession, type ChatFilters, type ChatSummary, defaultChatFilters } from "../services/chats";

const NAV_ITEMS: NavItem[] = ["Home", "ChatBot", "Canteens", "About", "Contact"];
const CHAT_PAGE_SIZE = 10;

const resolveInitialChatId = () => {
  const activeId = Chats.getActiveId();
  if (activeId && Chats.exists(activeId)) return activeId;
  const recent = Chats.listPage(0, 1)[0]?.id;
  if (recent) return recent;
  return Chats.create().id;
};

const ChatPage: React.FC = () => {
  const [activeNav, setActiveNav] = useState<NavItem>(NAV_ITEMS[0]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string>(() => resolveInitialChatId());
  const [chat, setChat] = useState<ChatSession>(() => Chats.getById(activeChatId, true)!);
  const [filters, setFilters] = useState<ChatFilters>(() => chat.filters ?? defaultChatFilters);
  const [menuCanteen, setMenuCanteen] = useState<Canteen | null>(null);
  const pendingMenuCanteen = useRef<Canteen | null>(null);

  const [chatPages, setChatPages] = useState(1);
  const [recentChats, setRecentChats] = useState<ChatSummary[]>(() =>
    Chats.listPage(0, CHAT_PAGE_SIZE)
  );
  const [hasMoreChats, setHasMoreChats] = useState(() =>
    Chats.listPage(CHAT_PAGE_SIZE, 1).length > 0
  );

  const { shortcuts, addShortcut, updateShortcut, deleteShortcut } = useShortcuts();

  const refreshChatList = useCallback((pages: number) => {
    const items = Chats.listPage(0, pages * CHAT_PAGE_SIZE);
    setRecentChats(items);
    setHasMoreChats(Chats.listPage(items.length, 1).length > 0);
  }, []);

  useEffect(() => {
    refreshChatList(chatPages);
  }, [chatPages, refreshChatList]);

  useEffect(() => {
    const unsubscribe = Chats.subscribe(() => refreshChatList(chatPages));
    return unsubscribe;
  }, [chatPages, refreshChatList]);

  useEffect(() => {
    const nextChat = Chats.getById(activeChatId, true)!;
    nextChat.touch();
    setChat(nextChat);
    setFilters(nextChat.filters ?? defaultChatFilters);
    setMenuCanteen(pendingMenuCanteen.current);
    pendingMenuCanteen.current = null;
    Chats.setActiveId(activeChatId);
  }, [activeChatId]);

  const updateChatFilters = useCallback(
    (next: ChatFilters) => {
      chat.setFilters(next);
      setFilters(next);
    },
    [chat]
  );

  const loadMoreChats = useCallback(() => {
    if (!hasMoreChats) return;
    setChatPages((prev) => prev + 1);
  }, [hasMoreChats]);

  const startNewChat = useCallback(
    (options?: { preselectedCanteen?: Canteen | null }) => {
      const fresh = Chats.create();
      const baseFilters = filters ?? defaultChatFilters;
      const nextFilters: ChatFilters = {
        ...baseFilters,
        canteens: options?.preselectedCanteen
          ? [options.preselectedCanteen]
          : baseFilters.canteens ?? [],
      };
      fresh.setFilters(nextFilters);
      pendingMenuCanteen.current = options?.preselectedCanteen ?? null;
      setActiveChatId(fresh.id);
      setActiveNav("ChatBot");
    },
    [filters]
  );

  const handleDeleteAllChats = useCallback(() => {
    Chats.deleteAll();
    const fresh = Chats.create();
    setChatPages(1);
    pendingMenuCanteen.current = null;
    setActiveChatId(fresh.id);
    setActiveNav("ChatBot");
    setDrawerOpen(false);
  }, []);

  const handleSelectChat = useCallback(
    (id: string) => {
      setActiveChatId(id);
      setActiveNav("ChatBot");
      setDrawerOpen(false);
    },
    []
  );

  const handleSelectCanteen = useCallback(
    (canteen: Canteen) => {
      startNewChat({ preselectedCanteen: canteen });
      setActiveNav("ChatBot");
      setDrawerOpen(false);
    },
    [startNewChat]
  );

  return (
    <S.PageRoot>
      <Header
        activeNav={activeNav}
        navItems={NAV_ITEMS}
        onNavClick={setActiveNav}
        onToggleSidebar={() => setDrawerOpen(!drawerOpen)}
      />

      <S.Shell>
        <S.BodyGrid $collapsed={isCollapsed}>
          <S.SidebarSlot>
            <Sidebar
              mode="desktop"
              drawerOpen={true}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
              onCloseDrawer={() => { }}
              navItems={NAV_ITEMS}
              activeNav={activeNav}
              onNavClick={setActiveNav}
              chats={recentChats}
              activeChatId={activeChatId}
              onSelectChat={handleSelectChat}
              onNewChat={startNewChat}
              onLoadMoreChats={loadMoreChats}
              hasMoreChats={hasMoreChats}
            />
          </S.SidebarSlot>

          <S.Content>
            {activeNav === "Canteens" ? (
              <CanteensPage
                onSelectCanteen={handleSelectCanteen}
                selectedCanteenIds={filters.canteens.map((canteen) => canteen.id)}
              />
            ) : activeNav === "Shortcuts" ? (
              <ShortcutsPage
                shortcuts={shortcuts}
                onCreateShortcut={addShortcut}
                onUpdateShortcut={updateShortcut}
                onDeleteShortcut={deleteShortcut}
              />
            ) : activeNav === "Settings" ? (
              <SettingsPage onDeleteAllChats={handleDeleteAllChats} />
            ) : (
              <Chat
                chat={chat}
                filters={filters}
                onFiltersChange={updateChatFilters}
                onStartNewChat={startNewChat}
                menuCanteen={menuCanteen}
                shortcuts={shortcuts}
                onCreateShortcut={addShortcut}
              />
            )}
          </S.Content>
        </S.BodyGrid>

        <Sidebar
          mode="drawer"
          drawerOpen={drawerOpen}
          onCloseDrawer={() => setDrawerOpen(false)}
          navItems={NAV_ITEMS}
          activeNav={activeNav}
          onNavClick={setActiveNav}
          chats={recentChats}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onNewChat={startNewChat}
          onLoadMoreChats={loadMoreChats}
          hasMoreChats={hasMoreChats}
        />
      </S.Shell>
    </S.PageRoot>
  );
};

export default ChatPage;
