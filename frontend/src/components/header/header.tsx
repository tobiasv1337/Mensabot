import React from "react";
import * as S from "./header.styles";
import mensaLogo from "../../../assets/logos/mensabot-logo-gradient.svg";

export type NavItem = string;

interface HeaderProps {
  activeNav: NavItem;
  navItems: NavItem[];
  onNavClick: (i: NavItem) => void;
  onOpenSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({
  activeNav,
  navItems,
  onNavClick,
  onOpenSidebar,
}) => {
  return (
    <S.HeaderContainer>

      {/* Left side */}
      <S.Left>
        <S.Brand>
          <S.LogoImg src={mensaLogo} />
          <S.Title>MensaMatch</S.Title>
        </S.Brand>
      </S.Left>

      {/* Right side */}
      <S.Right>
        {/* Desktop Navigation */}
        <S.NavArea>
          {navItems.map((n) => (
            <S.NavItem
              key={n}
              
              active={activeNav === n}
              onClick={() => onNavClick(n)}
            >
              {n}
            </S.NavItem>
          ))}
        </S.NavArea>

        {/* Mobile Burger */}
        <S.Burger onClick={onOpenSidebar}>☰</S.Burger>
      </S.Right>

    </S.HeaderContainer>
  );
};

export default Header;
