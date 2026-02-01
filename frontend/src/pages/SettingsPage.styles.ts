import styled from "styled-components";

export const HeaderCard = styled.div`
  position: relative;
  overflow: hidden;
  padding: 28px;
  border-radius: 24px;
  background: linear-gradient(135deg, ${({ theme }) => theme.surfaceCard}, ${({ theme }) => theme.surfaceInset});
  border: 1px solid ${({ theme }) => `${theme.textMuted}26`};
  box-shadow: 0 22px 40px ${({ theme }) => `${theme.textDark}1F`};
`;

export const HeaderEyebrow = styled.div`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.textSecondary};
  margin-bottom: 12px;
`;

export const HeaderTitle = styled.h1`
  font-size: clamp(26px, 3.6vw, 36px);
  margin: 0 0 10px 0;
  color: ${({ theme }) => theme.textOnCard};
`;

export const HeaderSubtitle = styled.p`
  margin: 0;
  max-width: 560px;
  font-size: 15px;
  color: ${({ theme }) => theme.textSecondary};
  line-height: 1.6;
`;

export const SectionCard = styled.section`
  display: grid;
  gap: 16px;
  padding: 22px;
  border-radius: 20px;
  background: ${({ theme }) => theme.surfaceCard};
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  box-shadow: 0 16px 32px ${({ theme }) => `${theme.textDark}14`};
`;

export const SectionHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const SectionTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  color: ${({ theme }) => theme.textOnCard};
`;

export const SectionSubtitle = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.textSecondary};
  line-height: 1.5;
`;

export const SectionBody = styled.div`
  display: grid;
  gap: 12px;
`;

export const SettingRow = styled.div<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  background: ${({ theme }) => theme.surfaceInset};

  ${({ $danger, theme }) =>
    $danger &&
    `
    border-color: ${theme.accent1}44;
    background: ${theme.accent1}10;
  `}

  @media (max-width: 720px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

export const SettingInfo = styled.div`
  display: grid;
  gap: 6px;
`;

export const SettingLabel = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: ${({ theme }) => theme.textOnCard};
`;

export const SettingDescription = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.textSecondary};
  line-height: 1.5;
`;

export const SettingActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

export const DangerButton = styled.button`
  all: unset;
  cursor: pointer;
  padding: 10px 16px;
  border-radius: 12px;
  background: ${({ theme }) => theme.accent1};
  color: ${({ theme }) => theme.textOnAccent1};
  font-weight: 600;
  text-align: center;

  &:hover {
    filter: brightness(0.96);
  }
`;

export const MutedNote = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.textMuted};
`;
