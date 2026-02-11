import styled, { keyframes } from "styled-components";

const fadeUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 200vh;
  gap: 2rem;
  
  @media (max-width: 768px) {
    min-height: auto;
  }
`;

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  padding: 0 1rem;
  box-sizing: border-box;

  @media (max-width: 768px) {
    min-height: auto;
    padding: 0;
  }
`;

export const UpperSection = styled(Section)`
  /* Using Page background from CanteensPage layout concept */
  background-color: transparent; 
  color: ${({ theme }) => theme.textOnPage};
  
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 2rem;
  align-items: center;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    display: flex;
    flex-direction: column;
  }
`;

export const ImageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  
  img {
    max-width: 100%;
    max-height: 80vh;
    object-fit: contain;
    border-radius: 18px;
    box-shadow: 0 8px 24px ${({ theme }) => `${theme.accent1}1A`};
  }

  @media (max-width: 900px) {
    width: 100%;
    margin-bottom: 2rem;
    
    img {
      max-height: 350px;
    }
  }
`;

export const ContentBox = styled.div`
  padding: 32px;
  border-radius: 28px;
  background: linear-gradient(135deg, ${({ theme }) => theme.surfaceCard}, ${({ theme }) => theme.surfaceInset});
  border: 1px solid ${({ theme }) => `${theme.textMuted}26`};
  box-shadow: 0 24px 45px ${({ theme }) => `${theme.textDark}1F`};
  position: relative;
  overflow: hidden;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;

  &::after {
    content: "";
    position: absolute;
    top: -60%;
    right: -20%;
    width: 60%;
    height: 140%;
    background: linear-gradient(120deg, ${({ theme }) => `${theme.accent3}40`}, transparent);
    transform: rotate(12deg);
    pointer-events: none;
  }
`;

export const ContentColumn = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

export const SectionEyebrow = styled.div`
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.textSecondary};
  margin-bottom: 12px;
`;

export const SectionTitle = styled.h1`
  font-size: clamp(32px, 5vw, 48px);
  margin: 0;
  color: ${({ theme }) => theme.textPrimary};
  line-height: title;
`;

export const InteractiveCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
  width: 100%;
`;

export const FactCard = styled.div`
  padding: 24px;
  border-radius: 24px;
  background: ${({ theme }) => theme.surfaceCard};
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  box-shadow: 0 14px 28px ${({ theme }) => `${theme.textDark}14`};
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  animation: ${fadeUp} 0.5s ease both;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 18px 34px ${({ theme }) => `${theme.textDark}22`};
    border-color: ${({ theme }) => `${theme.accent1}44`};
  }
`;

export const CardIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: ${({ theme }) => theme.surfaceInset};
  color: ${({ theme }) => theme.accent1};
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  box-shadow: inset 0 2px 4px ${({ theme }) => `${theme.textDark}0A`};
`;

export const CardTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.textOnCard};
`;

export const CardText = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.textSecondary};
  line-height: 1.6;
`;

export const LowerSection = styled(Section)`
  /* Darker background for contrast, using surfaceElevated or a gradient */
  background: linear-gradient(180deg, ${({ theme }) => theme.surfacePage} 0%, ${({ theme }) => theme.surfaceInset} 100%);
  justify-content: center;
  padding: 4rem 1rem;
  border-radius: 32px 32px 0 0;
  margin-top: -2rem; /* Slight overlap effect */
`;

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
      grid-template-columns: 1fr;
  }
`;

export const StatCard = styled.div`
  padding: 24px;
  border-radius: 20px;
  background: ${({ theme }) => theme.surfaceCard};
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  box-shadow: 0 10px 25px ${({ theme }) => `${theme.textDark}14`};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  animation: ${fadeUp} 0.5s ease both;
  gap: 8px;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 18px 34px ${({ theme }) => `${theme.textDark}22`};
    border-color: ${({ theme }) => `${theme.accent1}44`};
  }
`;

export const StatNumber = styled.div`
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, ${({ theme }) => theme.accent1}, ${({ theme }) => theme.accent2});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.2;
`;

export const StatLabel = styled.div`
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 700;
  color: ${({ theme }) => theme.textSecondary};
`;
