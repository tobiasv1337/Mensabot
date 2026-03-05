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
  padding: 2rem;
  box-sizing: border-box;
  animation: ${fadeUp} 0.5s ease both;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

export const ScreenWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 0 auto;
  gap: 3rem;
`;

export const UpperSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: center;
  text-align: center;
  width: 100%;
  color: ${({ theme }) => theme.textPrimary};
`;

export const Description = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.textSecondary};
  max-width: 100%;
  line-height: 1.6;
  margin: 0;
`;

//can be deleted needed just for color extraction later
export const EmailLink = styled.a`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.accent1};
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  background: ${({ theme }) => `${theme.accent1}15`};
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => `${theme.accent1}25`};
    transform: translateY(-2px);
  }
`;

export const LogosContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  flex-wrap: wrap;
  width: 75%;
  height: 25%;

  svg {
    width: auto;
    height: 5rem;
  }

  @media (max-width: 600px) {
    flex-direction: column;
    gap: 1.5rem;
  }
`;

export const ImpressumContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  background: ${({ theme }) => theme.surfaceCard};
  padding: 2.5rem;
  border-radius: 24px;
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  box-shadow: 0 10px 30px ${({ theme }) => `${theme.textDark}14`};
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  box-sizing: border-box;

  @media (max-width: 600px) {
    padding: 1.5rem;
  }
`;

export const ImpressumTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.textPrimary};
  margin: 0;
  margin-bottom: 0.5rem;
`;

export const ImpressumContentWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 2rem;

  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

export const ImpressumSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
`;

export const ImpressumSectionTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.textPrimary};
  margin: 0;
`;

export const ImpressumText = styled.p`
  font-size: 1rem;
  color: ${({ theme }) => theme.textSecondary};
  margin: 0;
`;
