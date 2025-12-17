import styled from "styled-components";

export const HeaderContainer = styled.header`
  height: 64px;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #0f172a;
  color: white;
`;

export const Left = styled.div`
  display: flex;
  align-items: center;
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const LogoImg = styled.img`
  height: 32px;
`;

export const Title = styled.h1`
  font-size: 18px;
  font-weight: 600;
`;

export const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
`;

export const NavArea = styled.nav`
  display: flex;
  gap: 16px;

  @media (max-width: 768px) {
    display: none;
  }
`;

export const NavItem = styled.div<{ active?: boolean }>`
  cursor: pointer;
  font-size: 14px;
  padding-bottom: 4px;
  border-bottom: 2px solid
    ${({ active }) => (active ? "#38bdf8" : "transparent")};

  &:hover {
    color: #38bdf8;
  }
`;

export const Burger = styled.button`
  display: none;
  font-size: 24px;
  background: none;
  border: none;
  color: white;
  cursor: pointer;

  @media (max-width: 768px) {
    display: block;
  }
`;
