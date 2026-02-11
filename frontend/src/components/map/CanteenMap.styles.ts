import styled, { keyframes } from "styled-components";

const fadeUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const Root = styled.div`
  position: relative;
  width: 100%;
  height: min(72vh, 740px);
  min-height: 520px;

  @media (max-width: 640px) {
    height: 64vh;
    min-height: 420px;
  }
`;

export const MapContainer = styled.div`
  position: absolute;
  inset: 0;

  /* Keep MapLibre controls from clashing with our overlay UI */
  .maplibregl-ctrl-top-right,
  .maplibregl-ctrl-top-left,
  .maplibregl-ctrl-bottom-right {
    display: none;
  }

  .maplibregl-ctrl-bottom-left {
    margin: 10px;
  }
`;

export const Overlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

export const Controls = styled.div`
  position: absolute;
  top: 14px;
  right: 14px;
  display: grid;
  gap: 10px;
  pointer-events: auto;
`;

export const ControlGroup = styled.div`
  display: grid;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => `${theme.textMuted}26`};
  background: ${({ theme }) => `${theme.surfaceCard}F2`};
  backdrop-filter: blur(12px);
  box-shadow: 0 16px 28px ${({ theme }) => `${theme.textDark}1F`};
`;

export const ControlButton = styled.button`
  height: 44px;
  width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }) => theme.textPrimary};
  background: transparent;
  border: none;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.surfaceInset};
  }

  &[aria-pressed="true"] {
    background: ${({ theme }) => theme.surfaceInset};
    color: ${({ theme }) => theme.accent1};
  }

  &:active {
    transform: translateY(0.5px);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent1};
    outline-offset: 2px;
  }

`;

export const StatusPill = styled.div<{ $tone?: "default" | "danger" }>`
  position: absolute;
  top: 14px;
  left: 14px;
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: ${({ theme, $tone }) =>
    $tone === "danger"
      ? `linear-gradient(135deg, ${theme.accent1}24, ${theme.surfaceCard}F2)`
      : `${theme.surfaceCard}F2`};
  color: ${({ theme }) => theme.textPrimary};
  border: 1px solid ${({ theme, $tone }) =>
    $tone === "danger" ? `${theme.accent1}33` : `${theme.textMuted}26`};
  backdrop-filter: blur(12px);
  box-shadow: 0 14px 22px ${({ theme }) => `${theme.textDark}1A`};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
`;

export const DetailsCard = styled.div`
  position: absolute;
  left: 16px;
  bottom: 16px;
  width: min(420px, calc(100% - 32px));
  pointer-events: auto;
  border-radius: 20px;
  border: 1px solid ${({ theme }) => `${theme.textMuted}26`};
  background: linear-gradient(135deg, ${({ theme }) => theme.surfaceCard}, ${({ theme }) => `${theme.surfaceInset}F2`});
  box-shadow: 0 24px 40px ${({ theme }) => `${theme.textDark}26`};
  overflow: hidden;
  animation: ${fadeUp} 0.22s ease both;

  @media (max-width: 640px) {
    left: 12px;
    right: 12px;
    bottom: 12px;
    width: auto;
  }
`;

export const DetailsHeader = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 16px 12px 16px;
`;

export const DetailsTitle = styled.div`
  display: grid;
  gap: 6px;
`;

export const CanteenName = styled.div`
  font-size: 16px;
  font-weight: 800;
  color: ${({ theme }) => theme.textPrimary};
  letter-spacing: 0.01em;
`;

export const CanteenMeta = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.textSecondary};
  line-height: 1.4;
`;

export const CloseButton = styled.button`
  height: 36px;
  width: 36px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  background: ${({ theme }) => theme.surfaceInset};
  color: ${({ theme }) => theme.textOnInset};
  font-size: 18px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    filter: brightness(0.92);
  }
`;

export const DetailsBody = styled.div`
  padding: 0 16px 14px 16px;
  display: grid;
  gap: 10px;
`;

export const DetailRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 13px;
`;

export const DetailText = styled.div`
  color: ${({ theme }) => theme.textSecondary};
  font-size: 13px;
  line-height: 1.5;
`;

export const AttributionText = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.textMuted};
  line-height: 1.4;
`;

export const AttributionLink = styled.a`
  color: inherit;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

export const DetailPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: ${({ theme }) => theme.surfacePage};
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  color: ${({ theme }) => theme.textOnPage};
  font-size: 12px;
  font-weight: 700;
`;

export const Actions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 14px 16px 16px 16px;
  border-top: 1px solid ${({ theme }) => `${theme.textMuted}18`};

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

export const PrimaryAction = styled.button`
  padding: 11px 14px;
  border-radius: 14px;
  background: ${({ theme }) => theme.accent1};
  color: ${({ theme }) => theme.textOnAccent1};
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.03em;
  border: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 22px ${({ theme }) => `${theme.accent1}33`};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

export const SecondaryAction = styled.button`
  padding: 11px 14px;
  border-radius: 14px;
  background: ${({ theme }) => theme.surfaceInset};
  color: ${({ theme }) => theme.textOnInset};
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.03em;
  border: 1px solid ${({ theme }) => `${theme.textMuted}28`};
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 18px ${({ theme }) => `${theme.textDark}14`};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;
