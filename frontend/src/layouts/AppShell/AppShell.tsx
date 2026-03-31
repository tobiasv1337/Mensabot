import React, { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AppHeader from "@/features/shell/components/AppHeader";
import AppSidebar from "@/features/shell/components/AppSidebar";
import { NAV_ROUTES, navItemFromPath, type NavItem } from "@/features/shell/navigation";
import * as S from "./AppShell.styles";
import type { Canteen } from "@/shared/api/MensaBotClient";
import { useOnlineStatus } from "@/shared/services/networkStatus";
import { useShortcuts } from "@/features/shortcuts/model/shortcuts";
import { useTranslation } from "react-i18next";
import { useInstallPromotion } from "@/features/install/model/useInstallPromotion";
import InstallPromptCard from "@/features/install/components/InstallPromptCard";
import InstallInstructionsModal from "@/features/install/components/InstallInstructionsModal";
import { getInstallEntryCopy, getInstallPromptCopy } from "@/features/install/model/installCopy";
import type { AppShellContextValue } from "./useAppShellContext";
import { ChatWorkspaceProvider } from "@/features/chat/ChatWorkspaceProvider";
import { useChatWorkspace } from "@/features/chat/chatWorkspace";

const NAV_ITEMS: NavItem[] = ["Home", "ChatBot", "Canteens", "Map", "ProjectFacts", "LegalNotice"];
const AppShellContent: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const {
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
    resetActiveChat,
    deleteAllChats,
  } = useChatWorkspace();

  const activeNav = navItemFromPath(location.pathname) ?? "Home";
  const setActiveNav = useCallback((item: NavItem) => navigate(NAV_ROUTES[item]), [navigate]);

  useEffect(() => {
    if (location.pathname !== "/" && location.pathname.endsWith("/")) {
      navigate(location.pathname.slice(0, -1), { replace: true });
    }
  }, [location.pathname, navigate]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [chatComposerHeight, setChatComposerHeight] = useState(0);
  const isChatView = activeNav === "ChatBot";

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

  const handleStartNewChat = useCallback(
    (options?: { preselectedCanteen?: Canteen | null }) => {
      startNewChat(options);
      navigate(NAV_ROUTES.ChatBot);
    },
    [navigate, startNewChat],
  );

  const handleDeleteAllChats = useCallback(() => {
    deleteAllChats();
    navigate(NAV_ROUTES.ChatBot);
    setDrawerOpen(false);
  }, [deleteAllChats, navigate]);

  const handleSelectChat = useCallback(
    (id: string) => {
      selectChat(id);
      setActiveNav("ChatBot");
      setDrawerOpen(false);
    },
    [selectChat, setActiveNav],
  );

  const handleSelectCanteen = useCallback(
    (canteen: Canteen) => {
      handleStartNewChat({ preselectedCanteen: canteen });
      setDrawerOpen(false);
    },
    [handleStartNewChat],
  );

  const handleSidebarNavClick = useCallback(
    (target: NavItem) => {
      if (target === "ChatBot") {
        handleStartNewChat();
        setDrawerOpen(false);
        return;
      }

      setActiveNav(target);
    },
    [handleStartNewChat, setActiveNav],
  );

  const handleResetOnboarding = useCallback(() => {
    resetActiveChat();
    navigate(NAV_ROUTES.ChatBot);
  }, [navigate, resetActiveChat]);

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
  const selectedCanteenIds = filters.canteens.map((canteen) => canteen.id);
  const shellContext: AppShellContextValue = {
    isOffline,
    selectedCanteenIds,
    chat,
    filters,
    chatMode,
    menuCanteen,
    shortcuts,
    installEntry: persistentInstallEntry,
    onSelectCanteen: handleSelectCanteen,
    onStartNewChat: handleStartNewChat,
    onCreateShortcut: addShortcut,
    onUpdateShortcut: updateShortcut,
    onDeleteShortcut: deleteShortcut,
    onChatModeChange: setChatMode,
    onFiltersChange: updateChatFilters,
    onSuccessfulChat: markSuccessfulChat,
    onOnboardingActiveChange: setIsOnboardingActive,
    onChatComposerHeightChange: setChatComposerHeight,
    onDeleteAllChats: handleDeleteAllChats,
    onResetOnboarding: handleResetOnboarding,
  };

  return (
    <S.PageRoot>
      <AppHeader
        activeNav={activeNav}
        navItems={NAV_ITEMS}
        onNavClick={setActiveNav}
        onToggleSidebar={() => setDrawerOpen(!drawerOpen)}
      />

      <S.Shell>
        <S.BodyGrid $collapsed={isCollapsed}>
          <S.SidebarSlot>
            <AppSidebar
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
              onNewChat={handleStartNewChat}
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
              <Outlet context={shellContext} />
            </S.ContentBody>
            {proactiveInstallPrompt}
          </S.Content>
        </S.BodyGrid>

        <AppSidebar
          mode="drawer"
          drawerOpen={drawerOpen}
          onCloseDrawer={() => setDrawerOpen(false)}
          navItems={NAV_ITEMS}
          activeNav={activeNav}
          onNavClick={handleSidebarNavClick}
          chats={recentChats}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleStartNewChat}
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

const AppShell: React.FC = () => (
  <ChatWorkspaceProvider>
    <AppShellContent />
  </ChatWorkspaceProvider>
);

export default AppShell;
