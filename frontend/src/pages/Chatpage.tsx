import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/header/header";
import Sidebar from "../components/sidebar/sidebar";
import { NAV_ROUTES, navItemFromPath, type NavItem } from "../types/navigation";
import * as S from "./Chatpage.styles";
import Chat from "../components/chat/Chat.tsx";
import CanteensPage from "./CanteensPage";
import ShortcutsPage from "./ShortcutsPage";
import ProjectFactsPage from "./ProjectFactsPage";
import SettingsPage from "./SettingsPage";
import MapPage from "./MapPage";
import ContactPage from "./ContactPage";
import LandingPage from "./LandingPage";
import type { Canteen } from "../services/api";
import { type ChatMode, loadChatMode, saveChatMode } from "../services/chatMode";
import { useOnlineStatus } from "../services/networkStatus";
import { useShortcuts } from "../services/shortcuts";
import { Chats, Chat as ChatModel, type Chat as ChatSession, type ChatFilters, defaultChatFilters } from "../services/chats";
import { useTranslation } from "react-i18next";

const NAV_ITEMS: NavItem[] = ["Home", "ChatBot", "Canteens", "Map", "ProjectFacts", "LegalNotice"];
const CHAT_PAGE_SIZE = 10;

const resolveInitialChatId = () => {
  const activeId = Chats.getActiveId();
  if (activeId && Chats.exists(activeId)) return activeId;
  const recent = Chats.listPage(0, 1)[0]?.id;
  if (recent) return recent;
  return null;
};

const ChatPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;

  const activeNavMatch = navItemFromPath(location.pathname);
  const activeNav = activeNavMatch ?? "Home";
  const setActiveNav = useCallback((item: NavItem) => navigate(NAV_ROUTES[item]), [navigate]);

  useEffect(() => {
    if (!activeNavMatch) {
      navigate(NAV_ROUTES.Home, { replace: true });
    } else if (location.pathname !== "/" && location.pathname.endsWith("/")) {
      navigate(location.pathname.slice(0, -1), { replace: true });
    }
  }, [activeNavMatch, location.pathname, navigate]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isChatView = activeNav === "ChatBot";

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

  const { shortcuts, addShortcut, updateShortcut, deleteShortcut } = useShortcuts();

  useEffect(() => {
    const className = "chat-lock-scroll";
    if (isChatView) {
      document.body.classList.add(className);
    } else {
      document.body.classList.remove(className);
    }
    return () => document.body.classList.remove(className);
  }, [isChatView]);


  useSyncExternalStore(Chats.subscribe, Chats.getVersion, Chats.getVersion);

  const recentChats = Chats.listPage(0, chatPages * CHAT_PAGE_SIZE);
  const hasMoreChats = Chats.listPage(recentChats.length, 1).length > 0;

  const activateChat = useCallback((id: string, options?: { menuCanteen?: Canteen | null }) => {
    const nextChat = Chats.getById(id, true)!;
    setActiveChatId(id);
    setChat(nextChat);
    setFilters(nextChat.filters ?? defaultChatFilters);
    setMenuCanteen(options?.menuCanteen ?? null);
  }, []);

  // Handle lazy creation of the initial chat to avoid side-effects in render
  const initDoneRef = useRef(false);
  useEffect(() => {
    if (activeChatId === "init_pending" && !initDoneRef.current) {
      initDoneRef.current = true;
      const fresh = Chats.create();
      activateChat(fresh.id);
    }
  }, [activeChatId, activateChat]);

  useEffect(() => {
    Chats.setActiveId(activeChatId);
  }, [chat, activeChatId]);

  useEffect(() => { saveChatMode(chatMode); }, [chatMode]);


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
      const baseFilters = filters ?? defaultChatFilters;
      const nextFilters: ChatFilters = {
        ...baseFilters,
        canteens: options?.preselectedCanteen
          ? [options.preselectedCanteen]
          : baseFilters.canteens ?? [],
      };
      const targetChat = (chat.hasUserMessage || chat.id === "init_pending") ? Chats.create() : chat;
      targetChat.setFilters(nextFilters);
      activateChat(targetChat.id, { menuCanteen: options?.preselectedCanteen ?? null });
      navigate(NAV_ROUTES.ChatBot);
    },
    [filters, chat, activateChat, navigate]
  );

  const handleDeleteAllChats = useCallback(() => {
    Chats.deleteAll();
    const fresh = Chats.create();
    setChatPages(1);
    activateChat(fresh.id);
    navigate(NAV_ROUTES.ChatBot);
    setDrawerOpen(false);
  }, [activateChat, navigate]);

  const handleSelectChat = useCallback(
    (id: string) => {
      activateChat(id);
      setActiveNav("ChatBot");
      setDrawerOpen(false);
    },
    [activateChat, setActiveNav]
  );

  const handleSelectCanteen = useCallback(
    (canteen: Canteen) => {
      startNewChat({ preselectedCanteen: canteen });
      setDrawerOpen(false);
    },
    [startNewChat]
  );

  const handleSidebarNavClick = useCallback(
    (target: NavItem) => {
      if (target === "ChatBot") {
        startNewChat();
        setDrawerOpen(false);
        return;
      }

      setActiveNav(target);
    },
    [startNewChat, setActiveNav]
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
              onNavClick={handleSidebarNavClick}
              chats={recentChats}
              activeChatId={activeChatId}
              onSelectChat={handleSelectChat}
              onNewChat={startNewChat}
              onLoadMoreChats={loadMoreChats}
              hasMoreChats={hasMoreChats}
            />
          </S.SidebarSlot>

          <S.Content $chat={isChatView} $flush={activeNav === "Home"}>
            {isOffline && (
              <S.StatusBanner role="status" aria-live="polite">
                <S.StatusDot aria-hidden="true" />
                <S.StatusContent>
                  <S.StatusTitle>{t('appStatus.offlineTitle')}</S.StatusTitle>
                  <S.StatusText>{t('appStatus.offlineBody')}</S.StatusText>
                </S.StatusContent>
              </S.StatusBanner>
            )}
            <S.ContentBody $chat={isChatView} $flush={activeNav === "Home"}>
              {activeNav === "Canteens" ? (
                <CanteensPage
                  onSelectCanteen={handleSelectCanteen}
                  selectedCanteenIds={filters.canteens.map((canteen) => canteen.id)}
                  isOffline={isOffline}
                />
              ) : activeNav === "ProjectFacts" ? (
                <ProjectFactsPage isOffline={isOffline} />
              ) : activeNav === "LegalNotice" ? (
                <ContactPage />
              ) : activeNav === "Shortcuts" ? (
                <ShortcutsPage
                  shortcuts={shortcuts}
                  onCreateShortcut={addShortcut}
                  onUpdateShortcut={updateShortcut}
                  onDeleteShortcut={deleteShortcut}
                />
              ) : activeNav === "Settings" ? (
                <SettingsPage
                  onDeleteAllChats={handleDeleteAllChats}
                  onResetOnboarding={() => {
                    const fresh = Chats.create();
                    activateChat(fresh.id);
                    navigate(NAV_ROUTES.ChatBot);
                  }}
                />
              ) : activeNav === "Map" ? (
                <MapPage
                  isOffline={isOffline}
                  onSelectCanteen={handleSelectCanteen}
                  selectedCanteenIds={filters.canteens.map((canteen) => canteen.id)}
                />
              ) : activeNav === "Home" ? (
                <LandingPage onStartChat={() => startNewChat()} />
              ) : (
                <Chat
                  chat={chat}
                  filters={filters}
                  chatMode={chatMode}
                  onChatModeChange={setChatMode}
                  onFiltersChange={updateChatFilters}
                  onStartNewChat={startNewChat}
                  menuCanteen={menuCanteen}
                  shortcuts={shortcuts}
                  onCreateShortcut={addShortcut}
                  isOffline={isOffline}
                />
              )}
            </S.ContentBody>
          </S.Content>
        </S.BodyGrid>

        <Sidebar
          mode="drawer"
          drawerOpen={drawerOpen}
          onCloseDrawer={() => setDrawerOpen(false)}
          navItems={NAV_ITEMS}
          activeNav={activeNav}
          onNavClick={handleSidebarNavClick}
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
