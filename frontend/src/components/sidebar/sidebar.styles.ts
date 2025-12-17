import styled from "styled-components";

export const Backdrop = styled.div<{ open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  opacity: ${({ open }) => (open ? 1 : 0)};
  pointer-events: ${({ open }) => (open ? "auto" : "none")};
  transition: opacity 0.2s ease;
  z-index: 40;
`;

export const Sidebar = styled.aside<{
  open: boolean;
  collapsed: boolean;
}>`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: ${({ collapsed }) => (collapsed ? "64px" : "260px")};
  background: #020617;
  color: white;
  padding: 12px;
  z-index: 50;
  transform: ${({ open }) => (open ? "translateX(0)" : "translateX(-100%)")};
  transition: width 0.2s ease, transform 0.2s ease;

  @media (min-width: 768px) {
    transform: translateX(0);
  }
`;

export const HeaderArea = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  padding: 8px 4px;
`;

export const CollapseToggle = styled.button`
  background: none;
  border: none;
  cursor: pointer;
`;

export const Section = styled.div`
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const Item = styled.div<{ active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  background: ${({ active }) => (active ? "#1e293b" : "transparent")};

  &:hover {
    background: #1e293b;
  }
`;

export const Icon = styled.div`
  width: 20px;
  display: flex;
  justify-content: center;
`;

export const Footer = styled.div`
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
`;

export const ThemeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const CollapseToggleCenter = styled(CollapseToggle)`
  margin: 14px auto;
`;

export const IconImg = styled.img`
  filter: brightness(0) invert(1);
  width: 18px;
  height: 18px;
`;



export const ThemeBtn = styled.button<{ active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 6px;
  background: ${({ active }) => (active ? "#1e293b" : "transparent")};
  color: white;
  border: none;
  cursor: pointer;

  &:hover {
    background: #1e293b;
  }
`;
