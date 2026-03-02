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
  max-width: 1000px;
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

export const Title = styled.h1`
  font-size: clamp(32px, 5vw, 48px);
  margin: 0;
  background: linear-gradient(135deg, ${({ theme }) => theme.accent1}, ${({ theme }) => theme.accent2});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.2;
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
    width: 25%;
    height: auto;
  }

  @media (max-width: 600px) {
    flex-direction: column;
    gap: 1.5rem;
  }
`;

export const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  text-align: left;
`;

export const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export const Input = styled.input`
  padding: 1rem 1.2rem;
  border-radius: 12px;
  border: 1.5px solid ${({ theme }) => `${theme.textMuted}30`};
  background: ${({ theme }) => theme.surfaceInset};
  color: ${({ theme }) => theme.textPrimary};
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.accent1};
    box-shadow: 0 0 0 3px ${({ theme }) => `${theme.accent1}33`};
  }

  &::placeholder {
    color: ${({ theme }) => theme.textMuted};
  }
`;

export const TextArea = styled.textarea`
  padding: 1rem 1.2rem;
  border-radius: 12px;
  border: 1.5px solid ${({ theme }) => `${theme.textMuted}30`};
  background: ${({ theme }) => theme.surfaceInset};
  color: ${({ theme }) => theme.textPrimary};
  font-size: 1rem;
  resize: vertical;
  min-height: 140px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.accent1};
    box-shadow: 0 0 0 3px ${({ theme }) => `${theme.accent1}33`};
  }

  &::placeholder {
    color: ${({ theme }) => theme.textMuted};
  }
`;
