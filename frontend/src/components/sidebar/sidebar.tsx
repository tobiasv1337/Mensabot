import React, { useState } from "react"; // <--- useState hier hinzufügen
import * as S from "./sidebar.styles";
import type { NavItem } from "../header/header";

type ThemeMode = "Light" | "System" | "Dark";

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

/* Icons (Platzhalter) */
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
  // Lokaler Status nur für die Anzeige des Buttons
const [currentTheme, setCurrentTheme] = useState<ThemeMode>("System");


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

        {/* Mobile Drawer Header */}
        <S.MobileHeader>
          <S.MobileTitle>Menü</S.MobileTitle>
          <S.CloseBtn onClick={onCloseDrawer}>✕</S.CloseBtn>
        </S.MobileHeader>

        {/* NAVIGATION (nur sichtbar wenn NICHT collapsed) */}
        {!isCollapsed && (
          <S.SectionTitle>Navigation</S.SectionTitle>
        )}

        <S.NavSection>
          {navItems.map((n) => (
            <S.NavButton
              key={n}
              active={activeNav === n}
              collapsed={isCollapsed}
              onClick={() => {
                onNavClick(n);
                if (mode === "drawer") onCloseDrawer();
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

        {/* EINSTELLUNGEN (nur sichtbar wenn NICHT collapsed) */}
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

            </S.NavSection>
          </>
        )}

{/* FOOTER MIT DEM THEME BUTTON */}
<S.Footer $isCollapsed={isCollapsed}>
          {!isCollapsed && <S.FooterHint>Theme Switch</S.FooterHint>}
          <S.ThemeButtonGroup $isCollapsed={isCollapsed}>
            <S.SegmentButton 
              active={currentTheme === "Light"} 
              onClick={() => setCurrentTheme("Light")}
              title="Light Mode"
            >
              ☀️ {!isCollapsed && "Light"}
            </S.SegmentButton>
            
            <S.SegmentButton 
              active={currentTheme === "System"} 
              onClick={() => setCurrentTheme("System")}
              title="System Mode"
            >
              💻 {!isCollapsed && "System"}
            </S.SegmentButton>
            
            <S.SegmentButton 
              active={currentTheme === "Dark"} 
              onClick={() => setCurrentTheme("Dark")}
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
