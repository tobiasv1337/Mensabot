import React from "react";
import * as S from "./sidebar.styles";
import type { NavItem } from "../header/header";

import sidebarIcon from "../../assets/logos/sidebar.svg";
import favIcon from "../../assets/logos/favourites.svg";
import shortcutIcon from "../../assets/logos/shortcut.svg";
import settingsIcon from "../../assets/logos/settings.svg";
import darkIcon from "../../assets/logos/dark.svg";
import lightIcon from "../../assets/logos/light.svg";
import systemIcon from "../../assets/logos/system.svg";
import headerIcon from "../../assets/logos/header.svg";

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
  const isMobile =
    typeof window !== "undefined" && window.innerWidth < 768;

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
              onClick={() =>
                isMobile
                  ? onCloseMobile()
                  : setDesktopCollapsed(!desktopCollapsed)
              }
            >
              <S.IconImg src={sidebarIcon} alt="Sidebar Toggle" />
            </S.CollapseToggle>
          </S.HeaderArea>
        )}

        {/* Collapse toggle when collapsed */}
        {!expanded && (
          <S.CollapseToggleCenter
            onClick={() => setDesktopCollapsed(false)}
          >
            <S.IconImg src={sidebarIcon} alt="Expand Sidebar" />
          </S.CollapseToggleCenter>
        )}

        {/* --- SETTINGS SECTION --- */}
        {expanded && (
          <S.Section>
            <S.Item>
              <S.Icon>
                <S.IconImg src={favIcon} alt="" />
              </S.Icon>
              Mensa Favoriten
            </S.Item>

            <S.Item active>
              <S.Icon>
                <S.IconImg src={shortcutIcon} alt="" />
              </S.Icon>
              Shortcut
            </S.Item>

            <S.Item>
              <S.Icon>
                <S.IconImg src={settingsIcon} alt="" />
              </S.Icon>
              Einstellung X
            </S.Item>

            <S.Item>
              <S.Icon>
                <S.IconImg src={settingsIcon} alt="" />
              </S.Icon>
              Einstellung X
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
                <S.Icon>
                  <S.IconImg src={headerIcon} alt="" />
                </S.Icon>
                {n}
              </S.Item>
            ))}
          </S.Section>
        )}

        {/* --- FOOTER (Theme Switch) --- */}
        {expanded && (
          <S.Footer>
            <S.ThemeContainer>
              <S.ThemeBtn>
                <S.IconImg src={lightIcon} alt="" />
                Light
              </S.ThemeBtn>

              <S.ThemeBtn>
                <S.IconImg src={systemIcon} alt="" />
                System
              </S.ThemeBtn>

              <S.ThemeBtn active>
                <S.IconImg src={darkIcon} alt="" />
                Dark
              </S.ThemeBtn>
            </S.ThemeContainer>
          </S.Footer>
        )}
      </S.Sidebar>
    </>
  );
};

export default Sidebar;
