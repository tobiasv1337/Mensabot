import styled from "styled-components";

export const PageRoot = styled.div`
  min-height: 100dvh;
  background: ${({ theme }) => theme.surfacePage};
`;

export const Shell = styled.div`
  padding-top: 80px;
`;

export const StatusBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 24px;
  background:
    linear-gradient(135deg, ${({ theme }) => theme.surfaceAccent}22, ${({ theme }) => theme.surfacePage} 65%),
    ${({ theme }) => theme.surfacePage};
  border-bottom: 1px solid ${({ theme }) => theme.surfaceAccent}33;
  color: ${({ theme }) => theme.textOnPage};

  @media (max-width: 480px) {
    padding: 14px 16px;
    align-items: flex-start;
  }
`;

export const StatusDot = styled.span`
  width: 11px;
  height: 11px;
  flex: 0 0 auto;
  margin-top: 4px;
  border-radius: 999px;
  background: ${({ theme }) => theme.surfaceAccent};
  box-shadow: 0 0 0 6px ${({ theme }) => theme.surfaceAccent}22;
`;

export const StatusContent = styled.div`
  display: grid;
  gap: 4px;
`;

export const StatusTitle = styled.strong`
  font-size: 0.95rem;
  line-height: 1.2;
`;

export const StatusText = styled.span`
  color: ${({ theme }) => theme.textSecondary};
  font-size: 0.92rem;
  line-height: 1.35;
`;

export const BodyGrid = styled.div<{ $collapsed?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $collapsed }) =>
    $collapsed ? "72px" : "280px"} 1fr;
  min-height: calc(100dvh - 80px);
  transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 1023px), (hover: none) and (pointer: coarse) {
    grid-template-columns: 1fr;
  }
`;

export const SidebarSlot = styled.div`
  display: none;

  @media (min-width: 1024px) and (hover: hover) and (pointer: fine) {
    display: block;
    position: sticky;
    top: 80px;
    height: calc(100vh - 80px);
    background: ${({ theme }) => theme.surfacePage};
  }
`;

export const Content = styled.main<{ $chat?: boolean; $flush?: boolean }>`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  ${({ $chat }) =>
    $chat &&
    `
      height: calc(100dvh - 80px);
      overflow: hidden;
    `}

  background: ${({ theme }) => theme.surfacePage};
  color: ${({ theme }) => theme.textOnPage};
`;

export const ContentBody = styled.div<{ $chat?: boolean; $flush?: boolean }>`
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: ${({ $chat, $flush }) => ($flush ? "0" : $chat ? "24px 24px 0" : "24px")};

  @media (max-width: 480px) {
    padding: ${({ $chat, $flush }) => ($flush ? "0" : $chat ? "16px 16px 0" : "16px")};
  }
`;
