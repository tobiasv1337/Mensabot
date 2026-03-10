import styled from "styled-components";

export const PageRoot = styled.div`
  min-height: 100dvh;
  background: ${({ theme }) => theme.surfacePage};
`;

export const Shell = styled.div`
  padding-top: 80px;
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
  padding: ${({ $chat, $flush }) => ($flush ? "0" : $chat ? "24px 24px 0" : "24px")};
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

  @media (max-width: 480px) {
    padding: ${({ $chat, $flush }) => ($flush ? "0" : $chat ? "16px 16px 0" : "16px")};
  }
`;
