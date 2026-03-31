import styled from "styled-components";
import { Link } from "react-router-dom";

export const Header = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;

  height: 80px;
  z-index: 2000;

  background: ${({ theme }) => theme.surfacePage};
  border-bottom: 1px solid ${({ theme }) => theme.textMuted}22;

  /* 3-Spalten Grid => Center ist wirklich mittig */
  display: grid;
  grid-template-columns: 80px 1fr 80px;
  align-items: center;

  padding: 0 clamp(12px, 3vw, 32px);

  @media (min-width: 1024px) and (hover: hover) and (pointer: fine) {
    /* rechts braucht Platz für Nav, links kann schmal bleiben */
    grid-template-columns: 80px 1fr auto;
  }
`;

export const Left = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
`;

export const Center = styled.div`
  display: flex;
  justify-content: center;
`;

export const Right = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
`;

export const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 14px;
  color: inherit;
  text-decoration: none;
  border-radius: 14px;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.surfaceAccent};
    outline-offset: 4px;
  }
`;

export const LogoImg = styled.img`
  width: 40px;
  height: 40px;

  @media (max-width: 480px) {
    width: 32px;
    height: 32px;
  }
`;

export const Title = styled.div`
  color: ${({ theme }) => theme.textPrimary};
  font-weight: 700;
  letter-spacing: 0.3px;
  font-size: clamp(18px, 2.2vw, 28px);
`;

/* Burger: sichtbar <1024, unsichtbar auf Desktop */
export const BurgerButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 44px;
  height: 44px;

  background: transparent;
  border: none;
  color: ${({ theme }) => theme.textPrimary};
  cursor: pointer;
  font-size: 26px;
  border-radius: 10px;

  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.surfaceInset};
  }

  @media (min-width: 1024px) and (hover: hover) and (pointer: fine) {
    display: none;
  }
`;

/* Desktop Nav: nur >=1024 */
export const DesktopNav = styled.nav`
  display: none;
  gap: 18px;
  align-items: center;

  @media (min-width: 1024px) and (hover: hover) and (pointer: fine) {
    display: flex;
  }
`;

export const NavItem = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  padding: 8px 14px;
  border-radius: 12px;
  font-size: 15px;

  color: ${({ $active, theme }) =>
    $active ? theme.textOnAccent : theme.textSecondary};

  background: ${({ $active, theme }) =>
    $active ? theme.surfaceAccent : "transparent"};

  transition: background 0.18s ease, color 0.18s ease;

  &:hover {
    background: ${({ theme }) => theme.surfaceInset};
    color: ${({ theme }) => theme.textPrimary};
  }
`;
