import styled from "styled-components";

export const PageRoot = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.surfaceInset};
`;

export const Shell = styled.div`
  padding-top: 80px;
`;

export const BodyGrid = styled.div<{ $collapsed?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $collapsed }) =>
    $collapsed ? "72px" : "280px"} 1fr;
  min-height: calc(100vh - 80px);
  transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
  }
`;

export const SidebarSlot = styled.div`
  display: none;

  @media (min-width: 1024px) {
    display: block;
    position: sticky;
    top: 80px;
    height: calc(100vh - 80px);
    background: ${({ theme }) => theme.surfacePage};
  }
`;

export const Content = styled.main`
  padding: 24px;
  min-width: 0;

  background: ${({ theme }) => theme.surfaceInset};
  color: ${({ theme }) => theme.textOnPage};

  @media (max-width: 480px) {
    padding: 16px;
  }
`;
