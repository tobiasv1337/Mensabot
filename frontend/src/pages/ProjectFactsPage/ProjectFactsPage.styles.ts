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
   
  @media (max-width: 768px) {
    min-height: auto;
  }
`;

export const ScreenWrapper = styled.div<{ $fullScreen?: boolean }>`
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  gap: 3rem;
  /* If content fits, let it be natural height. If not, force it to be at least 100vh */
  min-height: ${({ $fullScreen }) => ($fullScreen ? '100vh' : 'auto')};
  /* UpperSection inside should fill remaining space */
  flex: ${({ $fullScreen }) => ($fullScreen ? '1' : '0 0 auto')};
`;

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: auto;
  box-sizing: border-box;
  gap: 1rem;

  @media (max-width: 768px) {
    min-height: auto;
  }
`;

export const UpperSection = styled(Section)`
  background-color: transparent; 
  color: ${({ theme }) => theme.textOnPage};
  
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 2rem;
  align-items: center;
  flex: 1;

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
    box-shadow: 0 8px 24px ${({ theme }) => `${theme.textDark}14`};
  }

  @media (max-width: 900px) {
    width: 100%;
    margin-bottom: 2rem;
    
    img {
      max-height: 350px;
    }
  }
`;

export const ContentColumn = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

export const SectionTitle = styled.h1`
  font-size: clamp(32px, 5vw, 48px);
  margin: 0;
  color: ${({ theme }) => theme.textPrimary};
  line-height: 1.2;
`;

export const InteractiveCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
  width: 100%;
`;

export const LowerSection = styled(Section)`
  gap: 3rem;
  justify-content: center;
  border-radius: 32px 32px 0 0;
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

export const Value = styled.div`
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

export const FlexContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
`;

export const IconWrapper = styled.span`
  color: ${({ theme }) => theme.accent1};
  display: flex;
  width: 44px;
  align-items: center;
  justify-content: center;
  svg {
    width: 100%;
    height: auto;
  }
`;

/* ── Creators Carousel ── */

export const CarouselSection = styled.div`
  position: relative;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
`;

export const CarouselViewport = styled.div`
  overflow: hidden;
  border-radius: 20px;
  padding: 8px 0;
`;

export const CarouselTrack = styled.div<{ $offset: number; $isTransitioning?: boolean }>`
  display: flex;
  gap: 1.5rem;
  transition: ${({ $isTransitioning = true }) => $isTransitioning ? 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'};
  transform: translateX(${({ $offset }) => $offset}px);
`;

export const CreatorCard = styled.div`
  flex: 0 0 calc((100% - 3rem) / 3);
  min-width: 0;
  padding: 28px 24px;
  border-radius: 20px;
  background: ${({ theme }) => theme.surfaceCard};
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  box-shadow: 0 10px 25px ${({ theme }) => `${theme.textDark}14`};
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  animation: ${fadeUp} 0.5s ease both;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 18px 34px ${({ theme }) => `${theme.textDark}22`};
    border-color: ${({ theme }) => `${theme.accent1}44`};
  }

  @media (max-width: 900px) {
    flex: 0 0 calc((100% - 1.5rem) / 2);
  }

  @media (max-width: 560px) {
    flex: 0 0 100%;
  }
`;

export const CreatorAvatar = styled.div`
  width: 160px;
  height: 160px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid ${({ theme }) => `${theme.accent1}44`};
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const AvatarFallback = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, ${({ theme }) => theme.accent1}, ${({ theme }) => theme.accent2});
  color: ${({ theme }) => theme.textLight};
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: 0.05em;
`;

export const CreatorName = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.textOnCard};
`;

export const CreatorRole = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: linear-gradient(135deg, ${({ theme }) => theme.accent1}, ${({ theme }) => theme.accent2});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

export const CreatorDescription = styled.p`
  margin: 0;
  font-size: 0.88rem;
  color: ${({ theme }) => theme.textSecondary};
  line-height: 1.55;
  flex: 1;
`;

export const SocialRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 4px;
`;

export const CarouselArrow = styled.button<{ $direction: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${({ $direction }) => ($direction === 'left' ? 'left: -20px;' : 'right: -20px;')}
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => `${theme.textMuted}33`};
  background: ${({ theme }) => theme.surfaceCard};
  color: ${({ theme }) => theme.textOnCard};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
  box-shadow: 0 4px 14px ${({ theme }) => `${theme.textDark}18`};
  transition: all 0.2s ease;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.accent1};
    color: ${({ theme }) => theme.textOnAccent1};
    border-color: ${({ theme }) => theme.accent1};
    box-shadow: 0 6px 20px ${({ theme }) => `${theme.accent1}44`};
  }

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }

  @media (max-width: 560px) {
    ${({ $direction }) => ($direction === 'left' ? 'left: -6px;' : 'right: -6px;')}
    width: 36px;
    height: 36px;
  }
`;

export const CarouselDots = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
`;

export const CarouselDot = styled.button<{ $active: boolean }>`
  width: ${({ $active }) => ($active ? '24px' : '8px')};
  height: 8px;
  border-radius: 999px;
  border: none;
  background: ${({ $active, theme }) =>
    $active
      ? theme.accent1
      : `${theme.textMuted}55`};
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0;

  &:hover {
    background: ${({ $active, theme }) =>
    $active ? theme.accent1 : `${theme.textMuted}99`};
  }
`;

