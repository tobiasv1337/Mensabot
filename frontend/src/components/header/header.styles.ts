import styled from "styled-components";

export const HeaderContainer = styled.header`
  position: fixed;
  top: 0;
  width: 100%;
  height: 80px;                /* Neue größere Höhe */
  background: #1e1f23;  
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 100px 0px 50px;
  z-index: 1000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

@media (max-width: 768px) {
   /* flex-direction: row-reverse;  ← TAUSCHT Reihenfolge */
     padding: 0 100px 0px 0px;
  justify-content: space-between;

  
}
`;

export const Left = styled.div`
  display: flex;
  align-items: center;

  /* MOBILE: Logo soll rechts stehen (order 2) */
  @media (max-width: 768px) {
    order: 2;
  }
`;

export const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;

  /* MOBILE: Burger links anzeigen (order 1) */
  @media (max-width: 768px) {
    order: 1;
  }
`;


export const Burger = styled.button`
  display: none;

  @media (max-width: 768px) {
    display: block;
    font-size: 22px;
    background: none;
    border: none;
    cursor: pointer;
    color: white;
  }
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 25px;

  /* Slightly shifted left visually */
  transform: translateX(-6px);

  @media (max-width: 768px) {
    gap: 10px;
    transform: translateX(0);
  }
`;

export const LogoImg = styled.img`
  height: 48px;
  width: 48px;

  @media (max-width: 768px) {
    height: 30px;
    width: 30px;
  }
`;

export const Title = styled.div`
  font-size: 38px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.5px;

  @media (max-width: 768px) {
    font-size: 20px;   /* Shrinking on small screens */
  }
`;

/* Desktop Navigation */
export const NavArea = styled.nav`
  display: flex;
  gap: 20px;

  @media (max-width: 768px) {
    display: none;
  }
`;


export const NavItem = styled.button<{ active?: boolean }>`
  all: unset;
  font-size: 18px;
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 12px;

  color: ${({ active }) => (active ? "#ffffff" : "#c7c7c7")};
  background: ${({ active }) => (active ? "#383a40" : "transparent")};
  transition: 0.2s ease;

  &:hover {
    background: #2f3237;
    color: #ffffff;
  }
`;
