import React from "react";
import * as S from "./sidebar.styles";
import type { NavItem } from "../header/header";
import { useTheme } from "../../theme/themeProvider";
import { Button } from "../button/button";
import { ButtonIconWrapper, ButtonTextWrapper } from "../button/button.styles";

import mensabotLogo from '../../assets/react.svg';

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
          <S.CollapseToggle onClick={onToggleCollapse}>
            {isCollapsed ? "»" : "«"}
          </S.CollapseToggle>
        )}



        {!isCollapsed && <S.SectionTitle>Navigation</S.SectionTitle>}

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
