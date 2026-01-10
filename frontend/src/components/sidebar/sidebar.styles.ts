import styled from "styled-components";

/* BACKDROP – nur Drawer */
export const Backdrop = styled.div<{
  isOpen: boolean;
  $mode: "desktop" | "drawer";
}>`
  display: none;

  ${({ $mode, isOpen }) =>
    $mode === "drawer" &&
    `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    opacity: ${isOpen ? 1 : 0};
    pointer-events: ${isOpen ? "auto" : "none"};
    transition: opacity 0.2s ease;
    z-index: 1990;

    @media (max-width: 1023px) {
      display: block;
    }
  `}
`;

/* SIDEBAR */
export const Sidebar = styled.aside<{
  isOpen: boolean;
  $mode: "desktop" | "drawer";
  $isCollapsed?: boolean;
}>`
  background: #1e1f23;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  /* ===== DESKTOP ===== */
  ${({ $mode, $isCollapsed }) =>
    $mode === "desktop" &&
    `
    width: ${$isCollapsed ? "72px" : "280px"};
    height: calc(100vh - 80px);
    transition: width 0.25s ease;

    @media (max-width: 1023px) {
      display: none;
    }
  `}

  /* ===== DRAWER ===== */
  ${({ $mode, isOpen }) =>
    $mode === "drawer" &&
    `
    position: fixed;
    top: 80px;
    left: 0;
    width: 260px;
    height: calc(100vh - 80px);
    z-index: 1995;

    transform: translateX(${isOpen ? "0" : "-100%"});
    transition: transform 0.25s ease;
    box-shadow: 10px 0 30px rgba(0,0,0,0.35);

    @media (min-width: 1024px) {
      display: none;
    }
  `}
`;

export const CollapseToggle = styled.button`
  all: unset;
  cursor: pointer;
  padding: 12px;
  display: flex;
  justify-content: center;
  color: rgba(255,255,255,0.5);
  font-size: 18px;

  &:hover {
    color: #ffffff;
  }
`;

export const MobileHeader = styled.div`
  display: none;

  @media (max-width: 1023px) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
`;

export const MobileTitle = styled.div`
  font-weight: 700;
  font-size: 14px;
`;

export const CloseBtn = styled.button`
  border: none;
  background: transparent;
  color: white;
  font-size: 18px;
  cursor: pointer;
`;

export const NavSection = styled.div`
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const SectionTitle = styled.div`
  margin: 16px 12px 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.4);
`;

export const NavButton = styled.button<{
  active?: boolean;
  collapsed?: boolean;
}>`
  all: unset;
  cursor: pointer;
  height: 44px;
  border-radius: 12px;

  display: flex;
  align-items: center;
  justify-content: ${({ collapsed }) =>
    collapsed ? "center" : "flex-start"};

  padding: ${({ collapsed }) => (collapsed ? "0" : "0 12px")};

  background: ${({ active }) => (active ? "#383a40" : "transparent")};
  color: ${({ active }) => (active ? "#ffffff" : "#c8c9cc")};

  &:hover {
    background: #2b2d31;
    color: #ffffff;
  }
`;

export const IconWrapper = styled.span`
  width: 44px;
  display: flex;
  justify-content: center;
  font-size: 20px;
`;

export const ButtonText = styled.span<{ collapsed?: boolean }>`
  white-space: nowrap;
  margin-left: 6px;

  ${({ collapsed }) =>
    collapsed &&
    `
    display: none;
  `}
`;






export const ThemeToggleButton = styled.button`
  all: unset;
  cursor: pointer;
  width: 100%;
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 10px;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

export const ThemeTextContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 8px;
`;

export const ThemeLabel = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
`;


export const ThemeButton = styled.button`
  all: unset;
  cursor: pointer;
  background: #f1f3f4; /* Hellgrauer Hintergrund wie im Bild */
  color: #202124;    /* Dunkler Text für Kontrast */
  height: 40px;
  width: 100%;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: #e8eaed;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

export const ThemeIconWrapper = styled.span`
  margin-right: 8px;
  font-size: 16px;
  display: flex;
  align-items: center;
`;

export const ThemeButtonText = styled.span`
  white-space: nowrap;
`;


export const Footer = styled.div<{ $isCollapsed?: boolean }>`
  margin-top: auto;
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`;

export const FooterHint = styled.div`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 8px;
  padding-left: 4px;
`;

export const ThemeButtonGroup = styled.div<{ $isCollapsed?: boolean }>`
  display: flex;
  background: #2b2d31; /* Dunkler Hintergrund für die Gruppe */
  padding: 4px;
  border-radius: 12px;
  gap: 2px;
  flex-direction: ${({ $isCollapsed }) => ($isCollapsed ? "column" : "row")};
`;

export const SegmentButton = styled.button<{ active: boolean }>`
  all: unset;
  cursor: pointer;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s ease;
  white-space: nowrap;

  /* Farben basierend auf Aktiv-Zustand */
  background: ${({ active }) => (active ? "#f1f3f4" : "transparent")};
  color: ${({ active }) => (active ? "#202124" : "#c8c9cc")};

  &:hover {
    ${({ active }) => !active && "background: rgba(255,255,255,0.05);"}
  }
`;