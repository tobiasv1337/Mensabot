import React, { useCallback } from "react";
import * as S from "./sidebar.styles";
import { NAV_LABELS, type NavItem } from "../../types/navigation";
import { useTheme } from "../../theme/useTheme";
import type { ChatSummary } from "../../services/chats";
import { Button } from "../button/button";
import { ButtonIconWrapper, ButtonTextWrapper } from "../button/button.styles";

import {
  AboutUsIcon,
  ChatIcon,
  ContactIcon,
  DarkModeIcon,
  HomeIcon,
  LightModeIcon,
  MapIcon,
  MensenIcon,
  NewChatIcon,
  ProjectFactsIcon,
  SettingsIcon,
  ShortcutsIcon,
  SideBarIcon,
  SystemModeIcon
} from "../icons";

interface SidebarProps {
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
    case "About":
      return <AboutUsIcon />;
    case "Contact":
      return <ContactIcon />;
    case "ProjectFacts":
      return <ProjectFactsIcon />;
    default:
      return "•";
  }
};

const Sidebar: React.FC<SidebarProps> = ({
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
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { mode: themeMode, toggleMode } = useTheme();

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
            {!isCollapsed && <S.SectionTitle>Navigation</S.SectionTitle>}
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
          {!isCollapsed && mode !== "desktop" && <S.SectionTitle>Navigation</S.SectionTitle>}

          <S.NavSection>
            {navItems.map((n) => (
              <Button
                key={n}
                variant="default"
                size="fill"
                active={activeNav === n}
                collapsed={isCollapsed}
                onClick={() => handleNavSelection(n)}
                title={isCollapsed ? (NAV_LABELS[n] ?? n) : undefined}
              >
                <ButtonIconWrapper>{getIcon(n)}</ButtonIconWrapper>
                <ButtonTextWrapper $collapsed={isCollapsed}>
                  {NAV_LABELS[n] ?? n}
                </ButtonTextWrapper>
              </Button>
            ))}
          </S.NavSection>

          {!isCollapsed && (
            <>
              <S.SectionTitle>Einstellungen</S.SectionTitle>

              <S.NavSection>
                <Button
                  variant="default"
                  size="fill"
                  active={activeNav === "Shortcuts"}
                  collapsed={isCollapsed}
                  onClick={() => handleNavSelection("Shortcuts")}>
                  <ButtonIconWrapper><ShortcutsIcon /></ButtonIconWrapper>
                  <ButtonTextWrapper $collapsed={isCollapsed}>
                    Shortcuts
                  </ButtonTextWrapper>
                </Button>

                <Button
                  variant="default"
                  size="fill"
                  active={activeNav === "Settings"}
                  collapsed={isCollapsed}
                  onClick={() => handleNavSelection("Settings")}>
                  <ButtonIconWrapper><SettingsIcon /></ButtonIconWrapper>
                  <ButtonTextWrapper $collapsed={isCollapsed}>
                    Einstellungen
                  </ButtonTextWrapper>
                </Button>

              </S.NavSection>

              <S.SectionTitle>Chats</S.SectionTitle>
              <S.ChatList>
                {chats.length === 0 && (
                  <S.ChatHint>Keine Chats gefunden.</S.ChatHint>
                )}
                <Button
                  variant="surfaceInsetBorder"
                  size="fill"
                  collapsed={isCollapsed}
                  onClick={handleNewChat}>
                  <ButtonIconWrapper><NewChatIcon /></ButtonIconWrapper>
                  <ButtonTextWrapper $collapsed={isCollapsed}>
                    Neuen Chat starten
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
                    Mehr Chats laden
                  </S.ChatLoadMore>
                )}
              </S.ChatList>
            </>
          )}
        </S.Main>
        {/* THEME SWITCHER */}
        <S.Footer $isCollapsed={isCollapsed}>
          {!isCollapsed && <S.FooterHint>Theme</S.FooterHint>}

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

export default Sidebar;
