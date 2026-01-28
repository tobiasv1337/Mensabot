import React from "react";
import * as S from "./header.styles";
import mensaLogo from "../../assets/mensabot-logo-gradient.svg";

export type NavItem = string;

interface HeaderProps {
  activeNav: NavItem;
  navItems: NavItem[];
  onNavClick: (i: NavItem) => void;
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({
  activeNav,
  navItems,
  onNavClick,
  onToggleSidebar,
}) => {
  return (
    <S.Header>
      {/* Left: Burger (nur <1024 sichtbar) */}
      <S.Left>
        <S.BurgerButton onClick={onToggleSidebar} aria-label="Toggle menu">
          ☰
        </S.BurgerButton>
      </S.Left>

      {/* Center: Brand immer mittig */}
      <S.Left>
        <S.Brand>
          <S.LogoImg src={mensaLogo} alt="MensaMatch Logo" />
          <S.Title>MensaMatch</S.Title>
        </S.Brand>
      </S.Left>

      {/* Right: Desktop Nav (nur >=1024 sichtbar) */}
      <S.Right>
        <S.DesktopNav aria-label="Hauptnavigation">
          {navItems.map((n) => (
            <S.NavItem
              key={n}
              active={activeNav === n}
              onClick={() => onNavClick(n)}
            >
              {n}
            </S.NavItem>
          ))}
        </S.DesktopNav>
      </S.Right>
    </S.Header>
  );
};

export default Header;
