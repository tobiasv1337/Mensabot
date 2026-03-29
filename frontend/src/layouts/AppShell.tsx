import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/header/header";
import Sidebar from "../components/sidebar/sidebar";
import { NAV_ROUTES, navItemFromPath, type NavItem } from "../types/navigation";
import * as S from "./AppShell.styles";
import Chat from "../components/chat/Chat.tsx";
import CanteensPage from "../pages/CanteensPage";
import ShortcutsPage from "../pages/ShortcutsPage";
import ProjectFactsPage from "../pages/ProjectFactsPage";
import SettingsPage from "../pages/SettingsPage";
import MapPage from "../pages/MapPage";
import LegalNoticePage from "../pages/LegalNoticePage";
import HomePage from "../pages/HomePage";
import type { Canteen } from "../services/api";
import { type ChatMode, loadChatMode, saveChatMode } from "../services/chatMode";
import { useOnlineStatus } from "../services/networkStatus";
import { useShortcuts } from "../services/shortcuts";
import { Chats, Chat as ChatModel, type Chat as ChatSession, type ChatFilters, defaultChatFilters } from "../services/chats";
import { useTranslation } from "react-i18next";
import { useInstallPromotion } from "../services/installPromotion";
import InstallPromptCard from "../components/install/InstallPromptCard";
import InstallInstructionsModal from "../components/install/InstallInstructionsModal";
import { getInstallEntryCopy, getInstallPromptCopy } from "../components/install/installCopy";

const NAV_ITEMS: NavItem[] = ["Home", "ChatBot", "Canteens", "Map", "ProjectFacts", "LegalNotice"];
const CHAT_PAGE_SIZE = 10;

const resolveInitialChatId = () => {
  const activeId = Chats.getActiveId();
  if (activeId && Chats.exists(activeId)) return activeId;
  const recent = Chats.listPage(0, 1)[0]?.id;
  if (recent) return recent;
  return null;
};

const AppShell: React.FC = () => {
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
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [chatComposerHeight, setChatComposerHeight] = useState(0);
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
  const {
    state: installPromotionState,
    markCountedSession,
    markSuccessfulChat,
    showPrompt,
    hidePrompt,
    dismissPrompt,
    promptInstall,
    closeInstructions,
  } = useInstallPromotion({ isOnline, isOnboardingActive });
  const installPromptCopy = getInstallPromptCopy(installPromotionState.capability, t);
  const installEntryCopy = getInstallEntryCopy(installPromotionState.capability, t);
  const canShowInstallPromptRoute =
    activeNav === "Home" ||
    activeNav === "ChatBot" ||
    activeNav === "Canteens" ||
    activeNav === "Map" ||
    activeNav === "ProjectFacts";

  useEffect(() => {
    const className = "chat-lock-scroll";
    if (isChatView) {
      document.body.classList.add(className);
    } else {
      document.body.classList.remove(className);
    }
    return () => document.body.classList.remove(className);
  }, [isChatView]);

  useEffect(() => {
    markCountedSession();
  }, [markCountedSession]);

  useEffect(() => {
    if (!canShowInstallPromptRoute) {
      hidePrompt();
      return;
    }

    if (installPromotionState.canShowProactive && !installPromotionState.promptVisible) {
      showPrompt();
      return;
    }

    if (installPromotionState.promptVisible && !installPromotionState.isPromptEligible) {
      hidePrompt();
    }
  }, [
    canShowInstallPromptRoute,
    hidePrompt,
    installPromotionState.canShowProactive,
    installPromotionState.isPromptEligible,
    installPromotionState.promptVisible,
    showPrompt,
  ]);


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
      queueMicrotask(() => activateChat(fresh.id));
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

  const proactiveInstallPrompt = installPromotionState.promptVisible && installPromptCopy ? (
    <InstallPromptCard
      placement={activeNav === "ChatBot" ? "chat" : "viewport"}
      chatOffset={chatComposerHeight > 0 ? chatComposerHeight + 20 : 156}
      title={installPromptCopy.title}
      body={installPromptCopy.body}
      actionLabel={installPromptCopy.actionLabel}
      maybeLaterLabel={t("installPromotion.actions.maybeLater")}
      dismissLabel={t("installPromotion.actions.dismiss")}
      onAction={() => {
        void promptInstall();
      }}
      onMaybeLater={hidePrompt}
      onDismiss={dismissPrompt}
    />
  ) : null;
  const persistentInstallEntry = installPromotionState.shouldShowPersistentEntry && installEntryCopy
    ? {
        ...installEntryCopy,
        onClick: () => {
          void promptInstall();
        },
      }
    : null;

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
              installEntry={persistentInstallEntry}
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
                <LegalNoticePage />
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
                  installEntry={persistentInstallEntry}
                />
              ) : activeNav === "Map" ? (
                <MapPage
                  isOffline={isOffline}
                  onSelectCanteen={handleSelectCanteen}
                  selectedCanteenIds={filters.canteens.map((canteen) => canteen.id)}
                />
              ) : activeNav === "Home" ? (
                <HomePage onStartChat={() => startNewChat()} />
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
                  onSuccessfulChat={markSuccessfulChat}
                  onOnboardingActiveChange={setIsOnboardingActive}
                  onComposerHeightChange={setChatComposerHeight}
                />
              )}
            </S.ContentBody>
            {proactiveInstallPrompt}
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
          installEntry={persistentInstallEntry}
        />
      </S.Shell>
      <InstallInstructionsModal
        capability={installPromotionState.capability}
        isOpen={installPromotionState.instructionsOpen}
        onClose={closeInstructions}
      />
    </S.PageRoot>
  );
};

export default AppShell;
