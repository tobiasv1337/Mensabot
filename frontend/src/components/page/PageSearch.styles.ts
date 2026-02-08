import styled from "styled-components";

export const SearchCard = styled.form`
  padding: 20px;
  border-radius: 20px;
  background: ${({ theme }) => theme.surfaceCard};
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  display: grid;
  gap: 14px;
`;

export const SearchRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
`;

export const SearchInput = styled.input`
  flex: 1;
  min-width: 220px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => `${theme.textMuted}35`};
  background: ${({ theme }) => theme.surfaceInset};
  color: ${({ theme }) => theme.textOnInset};
  font-size: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => `${theme.accent1}99`};
    box-shadow: 0 0 0 3px ${({ theme }) => `${theme.accent1}30`};
  }

  @media (max-width: 480px) {
    font-size: 16px;
  }
`;

export const SearchActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

export const ClearButton = styled.button`
  padding: 10px 14px;
  border-radius: 12px;
  background: ${({ theme }) => theme.surfaceInset};
  color: ${({ theme }) => theme.textOnInset};
  font-size: 13px;
  font-weight: 600;
  border: 1px solid ${({ theme }) => `${theme.textMuted}33`};
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 18px ${({ theme }) => `${theme.textDark}14`};
  }
`;

export const SearchMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  font-size: 13px;
  color: ${({ theme }) => theme.textSecondary};
`;

export const MetaPill = styled.span`
  padding: 6px 10px;
  border-radius: 999px;
  background: ${({ theme }) => theme.surfaceInset};
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  font-weight: 600;
`;

