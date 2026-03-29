import styled from "styled-components";

/* BACKDROP – only Drawer */
export const Backdrop = styled.div<{
  $isOpen: boolean;
  $mode: "desktop" | "drawer";
}>`
  display: none;

  ${({ $mode, $isOpen }) =>
    $mode === "drawer" &&
    `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    opacity: ${$isOpen ? 1 : 0};
    pointer-events: ${$isOpen ? "auto" : "none"};
    transition: opacity 0.2s ease;
    z-index: 1990;

    @media (max-width: 1023px), (hover: none) and (pointer: coarse) {
      display: block;
    }
  `}
`;

/* SIDEBAR */
export const Sidebar = styled.aside<{
  $isOpen: boolean;
  $mode: "desktop" | "drawer";
  $isCollapsed?: boolean;
}>`
  background: ${({ theme }) => theme.surfacePage};
  border-right: 1px solid ${({ theme }) => theme.textMuted}22;
  color: ${({ theme }) => theme.textPrimary};
  display: flex;
  flex-direction: column;
  /* Overall sidebar does not scroll itself; content area will */
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom, 0px);

  /* ===== DESKTOP ===== */
  ${({ $mode, $isCollapsed }) =>
    $mode === "desktop" &&
    `
    width: ${$isCollapsed ? "72px" : "280px"};
    height: calc(100vh - 80px);
    transition: width 0.25s ease;

    @media (max-width: 1023px), (hover: none) and (pointer: coarse) {
      display: none;
    }
  `}

  /* ===== DRAWER ===== */
  ${({ $mode, $isOpen }) =>
    $mode === "drawer" &&
    `
    position: fixed;
    top: 80px;
    left: 0;
    width: 260px;
    height: calc(100dvh - 80px);
    z-index: 1995;

    transform: translateX(${$isOpen ? "0" : "-100%"});
    transition: transform 0.25s ease;
    box-shadow: ${$isOpen ? "0 12px 30px rgba(0,0,0,0.35)" : "none"};

    @media (min-width: 1024px) and (hover: hover) and (pointer: fine) {
      display: none;
    }
  `}
`;

export const Main = styled.div`
  flex: 1;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    width: 0;
    height: 0;
  }
`;

export const CollapseToggle = styled.button`
  all: unset;
  cursor: pointer;
  padding: 12px;
  display: flex;
  justify-content: center;
  color: ${({ theme }) => theme.textMuted};
  font-size: 18px;

  &:hover {
    color: ${({ theme }) => theme.textPrimary};
  }
`;

export const MobileHeader = styled.div`
  display: none;

  @media (max-width: 1023px), (hover: none) and (pointer: coarse) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px;
    border-bottom: 1px solid ${({ theme }) => theme.textMuted}22;
  }
`;

export const MobileTitle = styled.div`
  font-weight: 700;
  font-size: 14px;
`;

export const CloseBtn = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.textPrimary};
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
  color: ${({ theme }) => theme.textMuted};
`;

export const NavButton = styled.button<{
  $active?: boolean;
  $collapsed?: boolean;
}>`
  all: unset;
  cursor: pointer;
  height: 44px;
  border-radius: 12px;

  display: flex;
  align-items: center;
  justify-content: ${({ $collapsed }) =>
    $collapsed ? "center" : "flex-start"};

  padding: ${({ $collapsed }) => ($collapsed ? "0" : "0 12px")};

  background: ${({ $active, theme }) =>
    $active ? theme.surfaceAccent : "transparent"};

  color: ${({ $active, theme }) =>
    $active ? theme.textOnAccent : theme.textSecondary};

  &:hover {
    background: ${({ theme }) => theme.surfaceInset};
    color: ${({ theme }) => theme.textPrimary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent1};
    outline-offset: -2px;
  }
`;

export const IconWrapper = styled.span`
  width: 44px;
  display: flex;
  justify-content: center;
  font-size: 20px;
`;

export const ButtonText = styled.span<{ $collapsed?: boolean }>`
  white-space: nowrap;
  margin-left: 6px;

  ${({ $collapsed }) =>
    $collapsed &&
    `
    display: none;
  `}
`;

export const Footer = styled.div<{ $isCollapsed?: boolean }>`
  margin-top: auto;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid ${({ theme }) => theme.textMuted}22;
`;

export const FooterHint = styled.div`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: ${({ theme }) => theme.textMuted};
  margin-bottom: 8px;
  padding-left: 4px;
`;

export const ThemeButtonGroup = styled.div<{ $isCollapsed?: boolean }>`
  display: flex;
  background: ${({ theme }) => theme.surfaceInset};
  padding: 4px;
  border-radius: 12px;
  gap: 2px;
  flex-direction: ${({ $isCollapsed }) =>
    $isCollapsed ? "column" : "row"};
`;

export const SegmentButton = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s ease;
  white-space: nowrap;

  background: ${({ $active, theme }) =>
    $active ? theme.surfaceElevated : "transparent"};

  color: ${({ $active, theme }) =>
    $active ? theme.textOnElevated : `${theme.textOnInset}99`};

  &:hover {
    ${({ $active, theme }) =>
    !$active &&
    `
      background: ${theme.surfaceCard};
      color: ${theme.textOnCard};
    `}
  }
`;

export const ChatList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 8px 12px;
`;

export const ChatButton = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  padding: 10px 12px;
  border-radius: 12px;
  background: ${({ $active, theme }) =>
    $active ? theme.surfaceAccent : "transparent"};
  color: ${({ $active, theme }) =>
    $active ? theme.textOnAccent : theme.textSecondary};

  &:hover {
    background: ${({ theme }) => theme.surfaceInset};
    color: ${({ theme }) => theme.textPrimary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent1};
    outline-offset: -2px;
  }
`;

export const ChatTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ChatHint = styled.div`
  padding: 8px 12px;
  font-size: 11px;
  color: ${({ theme }) => theme.textMuted};
`;

export const ChatLoadMore = styled.button`
  all: unset;
  cursor: pointer;
  padding: 8px 12px;
  font-size: 11px;
  color: ${({ theme }) => theme.textMuted};
  border-radius: 10px;

  &:hover {
    background: ${({ theme }) => theme.surfaceInset};
    color: ${({ theme }) => theme.textPrimary};
  }
`;
