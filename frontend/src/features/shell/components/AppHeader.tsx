import React from "react";
import * as S from "./AppHeader.styles";
import mensaLogo from "../../../assets/mensabot-logo-gradient.svg";
import { Button } from "../../../shared/ui/button/Button";
import { getNavLabel, NAV_ROUTES, type NavItem } from "../navigation";
import { useTranslation } from "react-i18next";

interface AppHeaderProps {
  activeNav: NavItem;
  navItems: NavItem[];
  onNavClick: (i: NavItem) => void;
  onToggleSidebar: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  activeNav,
  navItems,
  onNavClick,
  onToggleSidebar,
}) => {
  const { t } = useTranslation();
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
        <S.Brand to={NAV_ROUTES.Home} aria-label="Go to landing page">
          <S.LogoImg src={mensaLogo} alt="Mensabot Logo" />
          <S.Title>Mensabot</S.Title>
        </S.Brand>
      </S.Left>

      {/* Right: Desktop Nav (nur >=1024 sichtbar) */}
      <S.Right>
        <S.DesktopNav aria-label="Hauptnavigation">
          {navItems.map((n) => (
            <Button
              key={n}
              variant="default"
              size="hug"
              active={activeNav === n}
              onClick={() => onNavClick(n)}
            >
              {getNavLabel(n, t)}
            </Button>
          ))}
        </S.DesktopNav>

      </S.Right>
    </S.Header>
  );
};

export default AppHeader;
