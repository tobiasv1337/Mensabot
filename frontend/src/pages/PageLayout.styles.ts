import styled from "styled-components";

export const Page = styled.section`
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: calc(100vh - 160px);
  padding-bottom: 32px;

  &::before,
  &::after {
    content: "";
    position: absolute;
    pointer-events: none;
    z-index: 0;
  }

  &::before {
    inset: -120px 0 auto 0;
    height: 240px;
    background:
      radial-gradient(60% 140% at 12% 20%, ${({ theme }) => `${theme.accent2}15`}, transparent 65%);
    opacity: 0.5;
  }

  &::after {
    inset: 0;
    background: linear-gradient(120deg, transparent 0%, ${({ theme }) => `${theme.textMuted}14`} 45%, transparent 80%);
    opacity: 0.45;
    mix-blend-mode: soft-light;
  }
`;

export const Content = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;
