import React from "react";
import * as S from "./sidebar.styles";
import type { NavItem } from "../header/header";
import sidebarIcon from "../../../assets/logos/sidebar.svg";
import favIcon from "../../../assets/logos/favourites.svg";
import shortcutIcon from "../../../assets/logos/shortcut.svg";
import settingsIcon from "../../../assets/logos/settings.svg";
import darkIcon from "../../../assets/logos/dark.svg";
import lightIcon from "../../../assets/logos/light.svg";
import systemIcon from "../../../assets/logos/system.svg";
import headerIcon from "../../../assets/logos/header.svg";


interface SidebarProps {
  mobileOpen: boolean;
  desktopCollapsed: boolean;
  setDesktopCollapsed: (v: boolean) => void;
  navItems: NavItem[];
  activeNav: NavItem;
  onNavClick: (i: NavItem) => void;
  onCloseMobile: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen,
  desktopCollapsed,
  setDesktopCollapsed,
  navItems,
  activeNav,
  onNavClick,
  onCloseMobile,
}) => {
const isMobile = window.innerWidth < 768;
const expanded = isMobile ? true : !desktopCollapsed;


  return (
    <>
      <S.Backdrop open={mobileOpen} onClick={onCloseMobile} />

   <S.Sidebar open={mobileOpen} collapsed={desktopCollapsed}>


    {/* --- HEADER AREA --- */}
    {expanded && (
      <S.HeaderArea>
        <span>Einstellungen</span>

        <S.CollapseToggle
          onClick={() => {
            if (isMobile) {
              onCloseMobile();
            } else {
              setDesktopCollapsed(!desktopCollapsed);
            }
          }}
        >
          <img src={sidebarIcon} className="white-icons" alt="sidebarIcon" />
        </S.CollapseToggle>
      </S.HeaderArea>
    )}

    {/* Collapse toggle when collapsed */}
    {!expanded && (
      <S.CollapseToggle
        style={{ margin: "14px auto" }}
        onClick={() => setDesktopCollapsed(false)}
      >
        <img src={sidebarIcon} className="white-icons" alt="sidebarIcon" />
      </S.CollapseToggle>
    )}

    {/* --- SETTINGS SECTION --- */}
    {expanded && (
      <S.Section>
        <S.Item>
          <S.Icon><img src={favIcon} className="white-icon" alt="Favorites icon" /></S.Icon> Mensa Favoriten
        </S.Item>

        <S.Item active>
          <S.Icon><img src={shortcutIcon} className="white-icon" /></S.Icon> Shortcut
        </S.Item>

        <S.Item>
          <S.Icon><img src={settingsIcon} className="white-icon" /></S.Icon> Einstellung X
        </S.Item>

        <S.Item>
          <S.Icon><img src={settingsIcon} className="white-icon" /></S.Icon> Einstellung X
        </S.Item>
      </S.Section>
    )}

    {/* --- MOBILE NAVIGATION (Header Inhalte) --- */}
    {mobileOpen && (
      <S.Section>
        {navItems.map((n) => (
          <S.Item
            key={n}
            active={activeNav === n}
            onClick={() => {
              onNavClick(n);
              onCloseMobile();
            }}
          >
            <S.Icon><img src={headerIcon} className="white-icon" /></S.Icon> {n}
          </S.Item>
        ))}
      </S.Section>
    )}


  {/* --- FOOTER (Theme Switch) --- */}
  {expanded && (
    <S.Footer>
      <S.ThemeContainer>
        <S.ThemeBtn>
          <img src={lightIcon} className="white-icon" /> Light
        </S.ThemeBtn>
        <S.ThemeBtn>
          <img src={systemIcon} className="white-icon" /> System
        </S.ThemeBtn>
        <S.ThemeBtn active>
          <img src={darkIcon} className="white-icon" /> Dark
        </S.ThemeBtn>
      </S.ThemeContainer>
    </S.Footer>
  )}

</S.Sidebar>

    </>
  );
};

export default Sidebar;
