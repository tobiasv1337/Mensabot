import styled from "styled-components";

export const Page = styled.section`
  display: grid;
  gap: 24px;
`;

export const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

export const Title = styled.h2`
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: ${({ theme }) => theme.textPrimary};
`;

export const Subtitle = styled.p`
  margin: 6px 0 0;
  font-size: 14px;
  color: ${({ theme }) => theme.textSecondary};
  max-width: 560px;
`;

export const PrimaryButton = styled.button`
  border: none;
  border-radius: 12px;
  padding: 10px 18px;
  background: ${({ theme }) => theme.accent1};
  color: ${({ theme }) => theme.textOnAccent1};
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 18px ${({ theme }) => `${theme.accent1}33`};
  }
`;

export const Grid = styled.div`
  display: grid;
  gap: 16px;
`;

export const Card = styled.article`
  border-radius: 16px;
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  background: ${({ theme }) => theme.surfaceCard};
  padding: 18px;
  display: grid;
  gap: 12px;
  box-shadow: 0 12px 24px ${({ theme }) => `${theme.textDark}12`};
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

export const CardTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.textPrimary};
`;

export const CardPrompt = styled.p`
  margin: 6px 0 0;
  font-size: 14px;
  color: ${({ theme }) => theme.textSecondary};
  white-space: pre-wrap;
`;

export const CardActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const ActionButton = styled.button<{ $variant?: "ghost" | "danger" }>`
  border: 1px solid
    ${({ theme, $variant }) =>
      $variant === "danger" ? `${theme.accent1}55` : `${theme.textMuted}40`};
  background: ${({ theme, $variant }) =>
    $variant === "danger" ? `${theme.accent1}15` : theme.surfacePage};
  color: ${({ theme, $variant }) => ($variant === "danger" ? theme.accent1 : theme.textPrimary)};
  border-radius: 10px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: ${({ theme }) => `${theme.accent1}77`};
  }
`;

export const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const MetaChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => `${theme.textMuted}33`};
  background: ${({ theme }) => theme.surfacePage};
  color: ${({ theme }) => theme.textSecondary};
  font-size: 12px;
  font-weight: 600;
`;

export const EmptyState = styled.div`
  padding: 32px;
  border-radius: 18px;
  border: 1px dashed ${({ theme }) => `${theme.textMuted}44`};
  background: ${({ theme }) => theme.surfaceInset};
  color: ${({ theme }) => theme.textSecondary};
  text-align: center;
`;
