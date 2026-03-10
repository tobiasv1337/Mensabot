import styled, { keyframes } from "styled-components";

const fadeUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`;

export const LandingRoot = styled.div`
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - 80px);
  position: relative;
  overflow: hidden;
`;

/* ── Hero Section ── */

export const HeroSection = styled.section`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 24px 64px;
  flex: 1;
  gap: 32px;
  isolation: isolate;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 70% 50% at 50% 0%, ${({ theme }) => `${theme.accent1}18`}, transparent 70%),
      radial-gradient(ellipse 50% 60% at 80% 100%, ${({ theme }) => `${theme.accent2}12`}, transparent 60%),
      radial-gradient(ellipse 40% 40% at 10% 80%, ${({ theme }) => `${theme.accent3}10`}, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }

  @media (max-width: 600px) {
    padding: 48px 16px 40px;
  }
`;

export const HeroContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  max-width: 720px;
  animation: ${fadeUp} 0.7s ease both;
`;

export const LogoWrapper = styled.div`
  width: 96px;
  height: 96px;
  animation: ${float} 4s ease-in-out infinite;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 8px 24px ${({ theme }) => `${theme.accent1}30`});
  }

  @media (max-width: 480px) {
    width: 72px;
    height: 72px;
  }
`;

export const HeroTitle = styled.h1`
  font-size: clamp(36px, 6vw, 64px);
  font-weight: 800;
  margin: 0;
  line-height: 1.1;
  color: ${({ theme }) => theme.textPrimary};
`;

export const GradientSpan = styled.span`
  background: linear-gradient(135deg, ${({ theme }) => theme.accent1}, ${({ theme }) => theme.accent2}, ${({ theme }) => theme.accent3});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

export const HeroSubtitle = styled.p`
  margin: 0;
  font-size: clamp(16px, 2.2vw, 20px);
  color: ${({ theme }) => theme.textSecondary};
  line-height: 1.6;
  max-width: 540px;
`;

export const CTAButton = styled.button`
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 36px;
  border-radius: 16px;
  font-size: 17px;
  font-weight: 700;
  background: linear-gradient(135deg, ${({ theme }) => theme.accent1}, ${({ theme }) => theme.accent2});
  color: ${({ theme }) => theme.textOnAccent1};
  box-shadow: 0 8px 28px ${({ theme }) => `${theme.accent1}40`};
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 36px ${({ theme }) => `${theme.accent1}55`};
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent1};
    outline-offset: 3px;
  }

  @media (max-width: 480px) {
    padding: 14px 28px;
    font-size: 16px;
  }
`;

export const CTAArrow = styled.span`
  display: inline-flex;
  font-size: 20px;
  transition: transform 0.2s ease;

  ${CTAButton}:hover & {
    transform: translateX(4px);
  }
`;

/* ── Features Section ── */

export const FeaturesSection = styled.section`
  position: relative;
  z-index: 1;
  padding: 48px 24px 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 36px;

  @media (max-width: 600px) {
    padding: 32px 16px 48px;
  }
`;

export const FeaturesTitle = styled.h2`
  font-size: clamp(22px, 3vw, 32px);
  font-weight: 700;
  margin: 0;
  color: ${({ theme }) => theme.textPrimary};
  text-align: center;
`;

export const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  width: 100%;
  max-width: 960px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    max-width: 480px;
  }
`;

export const FeatureCard = styled.div<{ $delay?: number }>`
  padding: 28px 24px;
  border-radius: 20px;
  background: ${({ theme }) => theme.surfaceCard};
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  box-shadow: 0 10px 25px ${({ theme }) => `${theme.textDark}14`};
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  animation: ${fadeUp} 0.5s ease both;
  animation-delay: ${({ $delay }) => ($delay ?? 0) * 0.1}s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 18px 34px ${({ theme }) => `${theme.textDark}22`};
    border-color: ${({ theme }) => `${theme.accent1}44`};
  }
`;

export const FeatureIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, ${({ theme }) => `${theme.accent1}18`}, ${({ theme }) => `${theme.accent2}18`});
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.accent1};

  svg {
    width: 24px;
    height: 24px;
  }
`;

export const FeatureTitle = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: ${({ theme }) => theme.textOnCard};
`;

export const FeatureDescription = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${({ theme }) => theme.textSecondary};
  line-height: 1.6;
`;

/* ── Footer / Bottom ── */

export const BottomSection = styled.div`
  text-align: center;
  padding: 0 24px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

export const BottomText = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.textMuted};
`;
