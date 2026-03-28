import styled, { css } from "styled-components";

export const CardShell = styled.section<{ $placement: "viewport" | "chat"; $chatOffset?: number }>`
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  background: ${({ theme }) => theme.surfaceCard};
  box-shadow:
    0 18px 42px ${({ theme }) => `${theme.textDark}26`},
    0 6px 14px ${({ theme }) => `${theme.textDark}12`};
  width: ${({ $placement }) =>
    $placement === "chat" ? "min(360px, calc(100% - 48px))" : "min(360px, calc(100vw - 48px))"};
  z-index: ${({ $placement }) => ($placement === "chat" ? 8 : 30)};

  ${({ $placement, $chatOffset = 144 }) =>
    $placement === "chat"
      ? css`
          position: absolute;
          right: 24px;
          bottom: calc(${$chatOffset}px + env(safe-area-inset-bottom, 0px));
        `
      : css`
          position: fixed;
          right: 24px;
          bottom: calc(24px + env(safe-area-inset-bottom, 0px));
        `}

  @media (max-width: 720px) {
    ${({ $placement, $chatOffset = 144 }) =>
      $placement === "chat"
        ? css`
            right: 16px;
            left: 16px;
            bottom: calc(${$chatOffset}px + env(safe-area-inset-bottom, 0px));
            width: auto;
          `
        : css`
            right: 16px;
            left: 16px;
            bottom: calc(16px + env(safe-area-inset-bottom, 0px));
            width: auto;
          `}
  }
`;

export const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
`;

export const IconBadge = styled.span`
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: ${({ theme }) => theme.surfaceInset};
  color: ${({ theme }) => theme.textOnInset};
`;

export const HeaderContent = styled.div`
  display: grid;
  gap: 6px;
  min-width: 0;
`;

export const Title = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.textOnCard};
`;

export const Body = styled.p`
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.textSecondary};
`;

export const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
`;

export const SecondaryActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
`;

export const DismissButton = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.textPrimary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent1};
    outline-offset: 3px;
    border-radius: 8px;
  }
`;

export const ModalIntro = styled.div`
  display: grid;
  gap: 8px;
`;

export const ModalBodyText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.textSecondary};
  line-height: 1.6;
`;

export const StepsList = styled.ol`
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
`;

export const StepItem = styled.li`
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 14px;
  align-items: flex-start;
  padding: 14px;
  border-radius: 16px;
  background: ${({ theme }) => theme.surfaceInset};
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
`;

export const StepNumber = styled.span`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: ${({ theme }) => `${theme.surfaceAccent}20`};
  color: ${({ theme }) => theme.surfaceAccent};
  font-weight: 700;
`;

export const StepContent = styled.div`
  display: grid;
  gap: 4px;
`;

export const StepTitle = styled.h4`
  margin: 0;
  font-size: 0.98rem;
  color: ${({ theme }) => theme.textOnElevated};
`;

export const StepBody = styled.p`
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.textSecondary};
`;
