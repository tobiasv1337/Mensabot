import styled from "styled-components";

export const Bar = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  padding: 10px 14px;

  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;

  box-shadow:
    0 6px 18px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
`;

export const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

export const SectionLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.textSecondary};
`;

export const PillsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const PillText = styled.span`
  font-size: 12px;
  font-weight: 500;
`;

export const TogglePill = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  cursor: pointer;

  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.accent1 : "rgba(255,255,255,0.14)"};

  background: ${({ theme, $active }) =>
    $active ? theme.accent1 : "rgba(255,255,255,0.06)"};

  color: ${({ theme, $active }) =>
    $active ? theme.textOnAccent1 : theme.textPrimary};

  backdrop-filter: blur(6px);
  transition: background 0.15s ease, border 0.15s ease;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? theme.accent1 : "rgba(255,255,255,0.12)"};
  }
`;

export const AddPill = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.06);
  color: ${({ theme }) => theme.textPrimary};
  cursor: pointer;
  font-size: 16px;

  backdrop-filter: blur(6px);

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
`;

export const TagPill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;

  backdrop-filter: blur(6px);
`;

export const RemoveButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 13px;
  cursor: pointer;
  padding: 0;
`;
