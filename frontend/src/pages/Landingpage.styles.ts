import styled from "styled-components";
import bg from "../assets/background.png";

export const PageRoot = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.surfacePage};
`;

export const HeroWrap = styled.main`
  position: relative;
  min-height: calc(100vh - 64px);
  display: grid;
  place-items: center;
  padding: 32px 16px;
  overflow: hidden;

  /* Background image layer */
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: url(${bg});
    background-size: cover;
    background-position: center;
    filter: blur(2px);
    transform: scale(1.03);
    opacity: 0.35;
    pointer-events: none;
  }

  /* Dark wash + vignette */
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.75) 100%),
      linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.55));
    pointer-events: none;
  }
`;

export const HeroCard = styled.section`
  position: relative;
  z-index: 1;
  width: min(860px, 92vw);
  padding: 40px 16px;
  text-align: center;

  /* Center glow behind the content */
  &::before {
    content: "";
    position: absolute;
    inset: -40px -16px;
    background: radial-gradient(circle at center, rgba(255, 160, 60, 0.20) 0%, rgba(255, 64, 64, 0.10) 30%, rgba(0,0,0,0) 65%);
    filter: blur(2px);
    z-index: -1;
  }
`;

export const Pill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 120, 80, 0.55);
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  letter-spacing: 0.2px;
`;

export const PillIcon = styled.span`
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 7px;
  border: 1px solid rgba(255, 120, 80, 0.55);
  color: rgba(255, 255, 255, 0.9);
`;

export const Title = styled.h1`
  margin: 26px 0 14px;
  line-height: 0.95;
  font-weight: 800;
  font-size: clamp(56px, 9vw, 104px);

  span {
    display: block;
    background: linear-gradient(180deg, #ffcc66 0%, #ff8a2a 35%, #ff4b3d 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    text-shadow: 0 12px 40px rgba(0,0,0,0.35);
  }
`;

export const Subtitle = styled.p`
  margin: 0 auto 26px;
  max-width: 720px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 14px;
  line-height: 1.6;
`;

export const CTAButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 22px;
  border-radius: 10px;
  border: 0;
  cursor: pointer;
  font-weight: 700;
  color: #fff;
  background: #ff4b3d;
  box-shadow: 0 12px 30px rgba(255, 75, 61, 0.25), 0 10px 30px rgba(0,0,0,0.35);
  transition: transform 0.15s ease, filter 0.15s ease;

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.03);
  }

  &:active {
    transform: translateY(0px);
    filter: brightness(0.98);
  }
`;

export const CTAIcon = styled.span`
  display: inline-grid;
  place-items: center;
`;
