import styled, { css, keyframes } from "styled-components";

const fadeUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const featureCardSurface = css`
  padding: 28px 24px;
  border-radius: 20px;
  background: ${({ theme }) => theme.surfaceCard};
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  box-shadow: 0 10px 25px ${({ theme }) => `${theme.textDark}14`};
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 18px 34px ${({ theme }) => `${theme.textDark}22`};
    border-color: ${({ theme }) => `${theme.accent1}44`};
  }
`;

export const featureCardIconBadge = css`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, ${({ theme }) => `${theme.accent1}18`}, ${({ theme }) => `${theme.accent2}18`});
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.accent1};
`;

export const CardRoot = styled.article<{ $delay?: number; $density?: "default" | "compact" }>`
  ${featureCardSurface}
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: ${({ $density = "default" }) => ($density === "compact" ? "0.5rem" : "0.7rem")};
  padding: ${({ $density = "default" }) => ($density === "compact" ? "18px 16px" : "28px 24px")};
  container-type: inline-size;
  animation: ${fadeUp} 0.5s ease both;
  animation-delay: ${({ $delay }) => ($delay ?? 0) * 0.08}s;
`;

export const IconBadge = styled.div<{ $density?: "default" | "compact" }>`
  ${featureCardIconBadge}
  width: ${({ $density = "default" }) => ($density === "compact" ? "36px" : "44px")};
  height: ${({ $density = "default" }) => ($density === "compact" ? "36px" : "44px")};
  border-radius: ${({ $density = "default" }) => ($density === "compact" ? "10px" : "12px")};

  svg {
    width: ${({ $density = "default" }) => ($density === "compact" ? "20px" : "24px")};
    height: ${({ $density = "default" }) => ($density === "compact" ? "20px" : "24px")};
  }
`;

export const Eyebrow = styled.div`
  color: ${({ theme }) => theme.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.78rem;
  font-weight: 800;
`;

export const Value = styled.div<{ $mode?: "metric" | "compact" | "inline" | "label"; $noWrap?: boolean }>`
  font-size: ${({ $mode = "metric" }) => {
    if ($mode === "inline") return "clamp(1rem, 2vw, 1.2rem)";
    if ($mode === "label") return "clamp(1rem, 8.5cqi, 1.6rem)";
    if ($mode === "compact") return "clamp(1.45rem, 2.8vw, 2rem)";
    return "clamp(1.9rem, 4vw, 2.7rem)";
  }};
  font-weight: 900;
  line-height: ${({ $mode = "metric" }) => ($mode === "inline" ? "1.25" : $mode === "label" ? "1.05" : "1")};
  letter-spacing: ${({ $mode = "metric" }) => ($mode === "label" ? "-0.03em" : "normal")};
  min-width: 0;
  white-space: ${({ $noWrap = false }) => ($noWrap ? "nowrap" : "normal")};
  overflow: ${({ $noWrap = false }) => ($noWrap ? "hidden" : "visible")};
  text-overflow: ${({ $noWrap = false }) => ($noWrap ? "ellipsis" : "clip")};
  background: linear-gradient(135deg, ${({ theme }) => theme.accent1}, ${({ theme }) => theme.accent2}, ${({ theme }) => theme.accent3});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

export const Title = styled.h3`
  margin: 0;
  font-size: 1.02rem;
  font-weight: 700;
  color: ${({ theme }) => theme.textOnCard};
  line-height: 1.35;
`;

export const Meta = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.88rem;
  line-height: 1.55;
`;

export const Description = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 0.92rem;
  line-height: 1.6;
`;
