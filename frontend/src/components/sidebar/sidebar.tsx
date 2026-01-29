import React from "react";
import * as S from "./sidebar.styles";
import type { NavItem } from "../header/header";
import { useTheme } from "../../theme/themeProvider";
import { Button } from "../button/button";
import { ButtonIconWrapper, ButtonTextWrapper } from "../button/button.styles";

import mensabotLogo from '../../assets/react.svg';
//import sideBarIcon from '../../assets/left-sidebar-icon.svg';

const SideBarIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 122.88 118.96"
    fill="currentColor"
    aria-hidden
  >
    <path d="M119.61,0H3.27A3.26,3.26,0,0,0,0,3.27V115.69A3.26,3.26,0,0,0,3.27,119H119.61a3.26,3.26,0,0,0,3.27-3.27V3.27A3.26,3.26,0,0,0,119.61,0ZM6.54,6.54H38.78V112.42H6.54V6.54Zm38.78,0h71V112.42h-71V6.54Z"/>
  </svg>
);

interface SidebarProps {
  mode: "desktop" | "drawer";
  drawerOpen: boolean;
  onCloseDrawer: () => void;

  navItems: NavItem[];
  activeNav: NavItem;
  onNavClick: (i: NavItem) => void;

  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

/* Icons */
const getIcon = (item: string) => {
  switch (item) {
    case "Home":
      return "🏠";
    case "ChatBot":
      return "💬";
    case "Mensen":
      return "🍴";
    case "Über Uns":
      return "👤";
    case "Kontakt":
      return "📇";
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
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { mode: themeMode, toggleMode } = useTheme();

  return (
    <>
      <S.Backdrop isOpen={drawerOpen} $mode={mode} onClick={onCloseDrawer} />

      <S.Sidebar
        isOpen={drawerOpen}
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

        <S.Content>
          {!isCollapsed && mode !== "desktop" && <S.SectionTitle>Navigation</S.SectionTitle>}
        
        {/* TODO Entfernen Delete when finished
        <S.NavSection>
          {navItems.map((n) => (
            <S.NavButton
              key={n}
              active={activeNav === n}
              collapsed={isCollapsed}
              onClick={() => {
                onNavClick(n);

                if (mode === "drawer") {
                  onCloseDrawer();
                }

                if (mode === "desktop" && !isCollapsed) {
                  onToggleCollapse?.();
                }
              }}
              title={isCollapsed ? n : undefined}
            >
              <S.IconWrapper>{getIcon(n)}</S.IconWrapper>
              <S.ButtonText collapsed={isCollapsed}>
                {n}
              </S.ButtonText>
            </S.NavButton>
          ))}
        </S.NavSection>*/}

        <S.NavSection>
          {navItems.map((n) => (
            <Button
              key={n}
              variant="default"
              size="fill"
              active={activeNav === n}
              collapsed={isCollapsed}
              onClick={() => {
                onNavClick(n);
                if (mode === "drawer") {
                  onCloseDrawer();
                }
              }}
              title={isCollapsed ? n : undefined}
            >
              <ButtonIconWrapper>{getIcon(n)}</ButtonIconWrapper>
              <ButtonTextWrapper collapsed={isCollapsed}>
                {n}
              </ButtonTextWrapper>
            </Button>
          ))}
        </S.NavSection>

{!isCollapsed && (
  <>
    <S.SectionTitle>Einstellungen</S.SectionTitle>

    <S.NavSection>
      <S.NavButton collapsed={isCollapsed}>
        <S.IconWrapper>⭐</S.IconWrapper>
        <S.ButtonText collapsed={isCollapsed}>
          Favoriten
        </S.ButtonText>
      </S.NavButton>

      <S.NavButton collapsed={isCollapsed}>
        <S.IconWrapper>⚙️</S.IconWrapper>
        <S.ButtonText collapsed={isCollapsed}>
          Einstellungen
        </S.ButtonText>
      </S.NavButton>

      <S.NavButton collapsed={isCollapsed}>
        <S.IconWrapper>🔀</S.IconWrapper>
        <S.ButtonText collapsed={isCollapsed}>
          Shortcuts
        </S.ButtonText>
      </S.NavButton>

      <S.NavButton collapsed={isCollapsed}>
        <S.IconWrapper>📍</S.IconWrapper>
        <S.ButtonText collapsed={isCollapsed}>
          Karte
        </S.ButtonText>
      </S.NavButton>

      <Button 
        variant="default" 
        size="fill"
        onClick={() => toggleMode("dark")}
      >
        <ButtonIconWrapper>
          <img src={mensabotLogo} alt="Mensabot" />
        </ButtonIconWrapper>
        <ButtonTextWrapper>Chathistorie</ButtonTextWrapper>
      </Button>
    </S.NavSection>
  </>
)}
        </S.Content>
        {/* THEME SWITCHER */}
        <S.Footer $isCollapsed={isCollapsed}>
          {!isCollapsed && <S.FooterHint>Theme</S.FooterHint>}

          <S.ThemeButtonGroup $isCollapsed={isCollapsed}>
            <S.SegmentButton
              active={themeMode === "light"}
              onClick={() => toggleMode("light")}
              title="Light Mode"
            >
              ☀️ {!isCollapsed && "Light"}
            </S.SegmentButton>

            <S.SegmentButton
              active={themeMode === "system"}
              onClick={() => toggleMode("system")}
              title="System Mode"
            >
              💻 {!isCollapsed && "System"}
            </S.SegmentButton>

            <S.SegmentButton
              active={themeMode === "dark"}
              onClick={() => toggleMode("dark")}
              title="Dark Mode"
            >
              🌙 {!isCollapsed && "Dark"}
            </S.SegmentButton>
          </S.ThemeButtonGroup>
        </S.Footer>
      </S.Sidebar>
    </>
  );
};

export default Sidebar;
