import styled from "styled-components";

export const HeroCard = styled.div`
  position: relative;
  overflow: hidden;
  padding: 28px;
  border-radius: 28px;
  background: linear-gradient(135deg, ${({ theme }) => theme.surfaceCard}, ${({ theme }) => theme.surfaceInset});
  border: 1px solid ${({ theme }) => `${theme.textMuted}26`};
  box-shadow: 0 24px 45px ${({ theme }) => `${theme.textDark}1F`};

  &::after {
    content: "";
    position: absolute;
    top: -60%;
    right: -20%;
    width: 60%;
    height: 140%;
    background: linear-gradient(120deg, ${({ theme }) => `${theme.accent3}40`}, transparent);
    transform: rotate(12deg);
  }
`;

export const HeroEyebrow = styled.div`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.textSecondary};
  margin-bottom: 12px;
`;

export const HeroTitle = styled.h1`
  font-size: clamp(28px, 4vw, 40px);
  margin: 0 0 12px 0;
  color: ${({ theme }) => theme.textOnCard};
`;

export const HeroSubtitle = styled.p`
  margin: 0;
  max-width: 560px;
  font-size: 15px;
  color: ${({ theme }) => theme.textSecondary};
  line-height: 1.6;
`;

