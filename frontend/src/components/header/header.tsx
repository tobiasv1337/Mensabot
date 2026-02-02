import React, { useEffect, useRef } from "react";
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
    const headerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const el = headerRef.current;
        if (!el) return;

        const updateHeaderHeight = () => {
            document.documentElement.style.setProperty(
                "--app-header-h",
                `${el.offsetHeight}px`
            );
        };

        updateHeaderHeight();

        const ro = new ResizeObserver(() => updateHeaderHeight());
        ro.observe(el);

        window.addEventListener("resize", updateHeaderHeight);
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", updateHeaderHeight);
        };
    }, []);

    return (
        <S.Header ref={headerRef}>
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
