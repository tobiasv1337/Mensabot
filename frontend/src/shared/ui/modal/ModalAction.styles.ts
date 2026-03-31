import styled from "styled-components";

export const ActionButton = styled.button<{ $variant?: "primary" | "secondary" }>`
  background: ${({ theme, $variant }) => ($variant === "secondary" ? theme.surfaceAccent : theme.accent1)};
  color: ${({ theme, $variant }) => ($variant === "secondary" ? theme.textOnAccent : theme.textOnAccent1)};
  padding: 0.55rem 1rem;
  border: none;
  border-radius: 0.6rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: transform 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent2};
    outline-offset: 2px;
  }
`;

export const InlineError = styled.span`
  color: ${({ theme }) => theme.accent1};
  font-size: 0.8rem;
  font-weight: 600;
`;
