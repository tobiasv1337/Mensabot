import React, { useCallback } from "react";
import * as S from "./AppSidebar.styles";
import { getNavLabel, type NavItem } from "../navigation";
import { useTheme } from "@/shared/theme/useTheme";
import { useTranslation } from "react-i18next";
import type { ChatSummary } from "@/features/chat/model/chatTypes";
import { Button } from "../../../shared/ui/button/Button";
import { ButtonIconWrapper, ButtonTextWrapper } from "../../../shared/ui/button/Button.styles";

import {
  ChatIcon,
  LegalNoticeIcon,
  DarkModeIcon,
  HomeIcon,
  LightModeIcon,
  MapIcon,
  MensenIcon,
  NewChatIcon,
  InstallIcon,
  AboutIcon,
  AnalyticsIcon,
  SettingsIcon,
  ShortcutsIcon,
  SideBarIcon,
  SystemModeIcon
} from "../../../shared/ui/icons";

interface AppSidebarProps {
  mode: "desktop" | "drawer";
  drawerOpen: boolean;
  onCloseDrawer: () => void;

  navItems: NavItem[];
  activeNav: NavItem;
  onNavClick: (i: NavItem) => void;

  chats: ChatSummary[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onLoadMoreChats: () => void;
  hasMoreChats: boolean;
  installEntry?: {
    label: string;
    onClick: () => void;
  } | null;

  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

/* Icons */
const getIcon = (item: string) => {
  switch (item) {
    case "Home":
      return <HomeIcon />;
    case "ChatBot":
      return <ChatIcon />;
    case "Canteens":
      return <MensenIcon />;
    case "Map":
      return <MapIcon />;
    case "LegalNotice":
      return <LegalNoticeIcon />;
    case "About":
      return <AboutIcon />;
    case "Analytics":
      return <AnalyticsIcon />;
    default:
      return "•";
  }
};

const AppSidebar: React.FC<AppSidebarProps> = ({
  mode,
  drawerOpen,
  onCloseDrawer,
  navItems,
  activeNav,
  onNavClick,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onLoadMoreChats,
  hasMoreChats,
  installEntry = null,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { mode: themeMode, toggleMode } = useTheme();
  const { t } = useTranslation();

  const handleNavSelection = (target: NavItem) => {
    onNavClick(target);

    if (mode === "drawer") {
      onCloseDrawer();
    }
  };

  const handleChatSelection = (id: string) => {
    onSelectChat(id);

    if (mode === "drawer") {
      onCloseDrawer();
    }
  };

  const handleNewChat = () => {
    onNewChat();
    if (mode === "drawer") {
      onCloseDrawer();
    }
  };

  const handleInstallClick = () => {
    installEntry?.onClick();
    if (mode === "drawer") {
      onCloseDrawer();
    }
  };

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!hasMoreChats) return;
      const el = event.currentTarget;
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (remaining <= 80) {
        onLoadMoreChats();
      }
    },
    [hasMoreChats, onLoadMoreChats]
  );

  return (
    <>
      <S.Backdrop $isOpen={drawerOpen} $mode={mode} onClick={onCloseDrawer} />

      <S.Sidebar
        $isOpen={drawerOpen}
        $mode={mode}
        $isCollapsed={isCollapsed}
      >
        {/* Desktop Collapse Toggle */}
        {mode === "desktop" && (
          <div style={{ display: 'flex', justifyContent: isCollapsed ? 'center' : 'space-between', alignItems: 'center' }}>
            {!isCollapsed && <S.SectionTitle>{t('sidebar.navigation')}</S.SectionTitle>}
            <Button
              variant="default"
              size="iconOnly"
              onClick={onToggleCollapse}
              title="Toggle Sidebar"
              iconLeft={<SideBarIcon />}
            />
          </div>
        )}

        <S.Main onScroll={handleScroll}>
          {!isCollapsed && mode !== "desktop" && <S.SectionTitle>{t('sidebar.navigation')}</S.SectionTitle>}

          <S.NavSection>
            {navItems.map((n) => (
              <Button
                key={n}
                variant="default"
                size="fill"
                active={activeNav === n}
                collapsed={isCollapsed}
                onClick={() => handleNavSelection(n)}
                title={isCollapsed ? getNavLabel(n, t) : undefined}
              >
                <ButtonIconWrapper>{getIcon(n)}</ButtonIconWrapper>
                <ButtonTextWrapper $collapsed={isCollapsed}>
                  {getNavLabel(n, t)}
                </ButtonTextWrapper>
              </Button>
            ))}
          </S.NavSection>

          {!isCollapsed && <S.SectionTitle>{t('sidebar.settingsSection')}</S.SectionTitle>}

          <S.NavSection>
            <Button
              variant="default"
              size="fill"
              active={activeNav === "Shortcuts"}
              collapsed={isCollapsed}
              onClick={() => handleNavSelection("Shortcuts")}
              title={isCollapsed ? t('nav.shortcuts') : undefined}
            >
              <ButtonIconWrapper><ShortcutsIcon /></ButtonIconWrapper>
              <ButtonTextWrapper $collapsed={isCollapsed}>
                {t('nav.shortcuts')}
              </ButtonTextWrapper>
            </Button>

            <Button
              variant="default"
              size="fill"
              active={activeNav === "Settings"}
              collapsed={isCollapsed}
              onClick={() => handleNavSelection("Settings")}
              title={isCollapsed ? t('nav.settings') : undefined}
            >
              <ButtonIconWrapper><SettingsIcon /></ButtonIconWrapper>
              <ButtonTextWrapper $collapsed={isCollapsed}>
                {t('nav.settings')}
              </ButtonTextWrapper>
            </Button>

            {installEntry && (
              <Button
                variant="default"
                size="fill"
                collapsed={isCollapsed}
                onClick={handleInstallClick}
                title={isCollapsed ? installEntry.label : undefined}
              >
                <ButtonIconWrapper><InstallIcon /></ButtonIconWrapper>
                <ButtonTextWrapper $collapsed={isCollapsed}>
                  {installEntry.label}
                </ButtonTextWrapper>
              </Button>
            )}
          </S.NavSection>

          {!isCollapsed && (
            <>
              <S.SectionTitle>{t('sidebar.chats')}</S.SectionTitle>
              <S.ChatList>
                {chats.length === 0 && (
                  <S.ChatHint>{t('sidebar.noChats')}</S.ChatHint>
                )}
                <Button
                  variant="surfaceInsetBorder"
                  size="fill"
                  collapsed={isCollapsed}
                  onClick={handleNewChat}>
                  <ButtonIconWrapper><NewChatIcon /></ButtonIconWrapper>
                  <ButtonTextWrapper $collapsed={isCollapsed}>
                    {t('sidebar.newChat')}
                  </ButtonTextWrapper>
                </Button>
                {chats.map((chat) => (
                  <S.ChatButton
                    key={chat.id}
                    $active={chat.id === activeChatId}
                    onClick={() => handleChatSelection(chat.id)}
                    title={chat.title}
                  >
                    <S.ChatTitle>{chat.title}</S.ChatTitle>
                  </S.ChatButton>
                ))}
                {hasMoreChats && (
                  <S.ChatLoadMore onClick={onLoadMoreChats}>
                    {t('sidebar.loadMore')}
                  </S.ChatLoadMore>
                )}
              </S.ChatList>
            </>
          )}
        </S.Main>
        {/* THEME SWITCHER */}
        <S.Footer $isCollapsed={isCollapsed}>
          {!isCollapsed && <S.FooterHint>{t('sidebar.theme')}</S.FooterHint>}

          <S.ThemeButtonGroup $isCollapsed={isCollapsed}>
            <S.SegmentButton
              $active={themeMode === "light"}
              onClick={() => toggleMode("light")}
              title="Light Mode"
            >
              <LightModeIcon /> {!isCollapsed && "Light"}
            </S.SegmentButton>

            <S.SegmentButton
              $active={themeMode === "system"}
              onClick={() => toggleMode("system")}
              title="System Mode"
            >
              <SystemModeIcon /> {!isCollapsed && "System"}
            </S.SegmentButton>

            <S.SegmentButton
              $active={themeMode === "dark"}
              onClick={() => toggleMode("dark")}
              title="Dark Mode"
            >
              <DarkModeIcon /> {!isCollapsed && "Dark"}
            </S.SegmentButton>
          </S.ThemeButtonGroup>
        </S.Footer>
      </S.Sidebar>
    </>
  );
};

export default AppSidebar;
