import styled from "styled-components";

export const Header = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;

  height: 80px;
  z-index: 2000;

  background: #1e1f23;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  /* 3-Spalten Grid => Center ist wirklich mittig */
  display: grid;
  grid-template-columns: 80px 1fr 80px;
  align-items: center;

  padding: 0 clamp(12px, 3vw, 32px);

  @media (min-width: 1024px) {
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

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
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
  color: #ffffff;
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
  color: #ffffff;
  cursor: pointer;
  font-size: 26px;
  border-radius: 10px;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  @media (min-width: 1024px) {
    display: none;
  }
`;

/* Desktop Nav: nur >=1024 */
export const DesktopNav = styled.nav`
  display: none;
  gap: 18px;
  align-items: center;

  @media (min-width: 1024px) {
    display: flex;
  }
`;

export const NavItem = styled.button<{ active?: boolean }>`
  all: unset;
  cursor: pointer;
  padding: 8px 14px;
  border-radius: 12px;
  font-size: 15px;

  color: ${({ active }) => (active ? "#ffffff" : "#c7c7c7")};
  background: ${({ active }) => (active ? "#383a40" : "transparent")};

  transition: 0.18s ease;

  &:hover {
    background: #2f3237;
    color: #ffffff;
  }
`;
