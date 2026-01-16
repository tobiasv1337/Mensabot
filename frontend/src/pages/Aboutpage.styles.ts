import styled from "styled-components";

export const PageRoot = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.surfacePage};
`;

export const ContentWrap = styled.main`
    width: 100%;
    padding: calc(64px + 32px) 16px 80px;
    display: flex;
    justify-content: center;
`;

export const ContentInner = styled.section`
  width: 100%;
  max-width: 960px;
  text-align: center;
`;

export const LogoImg = styled.img`
  display: block;
  margin: 6px auto 14px;
  height: 44px;
  width: auto;

  @media (min-width: 768px) {
    height: 60px;
    margin-bottom: 18px;
  }
`;

export const Title = styled.h1`
  margin: 0 0 14px;
  font-weight: 900;
  font-size: 30px;
  color: ${({ theme }) => theme.accent2};

  @media (min-width: 768px) {
    font-size: 44px;
    margin-bottom: 18px;
  }
`;

export const Paragraph = styled.p`
  margin: 0 auto 14px;
  max-width: 70ch;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 14px;
  line-height: 1.7;

  @media (min-width: 768px) {
    font-size: 16px;
  }
`;

export const MemberList = styled.div`
  margin-top: 26px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;

  @media (min-width: 768px) {
    gap: 14px;
    margin-top: 30px;
  }
`;

export const MemberPill = styled.div`
  padding: 12px 18px;
  border-radius: 999px;

  background: ${({ theme }) => theme.surfaceElevated};
  color: ${({ theme }) => theme.textOnElevated};

  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);

  font-weight: 700;
  font-size: 14px;
  line-height: 1;
  text-align: center;

  transition: transform 0.12s ease, filter 0.12s ease;

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.02);
  }
`;
