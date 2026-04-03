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

const shimmer = keyframes`
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
`;

const cardHover = css`
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 18px 34px ${({ theme }) => `${theme.textDark}22`};
    border-color: ${({ theme }) => `${theme.accent1}44`};
  }
`;

export const PageContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  isolation: isolate;

  @media (max-width: 640px) {
    gap: 1.5rem;
  }

  &::before,
  &::after {
    content: "";
    position: absolute;
    inset: auto;
    z-index: -1;
    filter: blur(80px);
    opacity: 0.22;
    pointer-events: none;
  }

  &::before {
    top: 2rem;
    right: 6%;
    width: 16rem;
    height: 16rem;
    background: ${({ theme }) => theme.accent3};
  }

  &::after {
    top: 18rem;
    left: -2rem;
    width: 18rem;
    height: 18rem;
    background: ${({ theme }) => theme.accent1};
  }
`;

export const HeroGrid = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.85fr);
  gap: 1.5rem;

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
`;

export const HeroContentCard = styled.div`
  position: relative;
  overflow: hidden;
  padding: 2rem;
  border-radius: 32px;
  background:
    radial-gradient(circle at top right, ${({ theme }) => `${theme.accent3}22`}, transparent 34%),
    linear-gradient(145deg, ${({ theme }) => theme.surfaceCard}, ${({ theme }) => theme.surfaceInset});
  border: 1px solid ${({ theme }) => `${theme.textMuted}24`};
  box-shadow: 0 28px 55px ${({ theme }) => `${theme.textDark}18`};
  animation: ${fadeUp} 0.5s ease both;

  @media (max-width: 640px) {
    padding: 1.35rem;
    border-radius: 24px;
  }
`;

export const HeroSubtitle = styled.p`
  margin: 0;
  max-width: 42rem;
  font-size: 1rem;
  line-height: 1.7;
  color: ${({ theme }) => theme.textSecondary};
`;

export const HeroBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

export const HeroBadge = styled.div`
  padding: 0.7rem 1rem;
  border-radius: 999px;
  background: ${({ theme }) => `${theme.surfacePage}CC`};
  border: 1px solid ${({ theme }) => `${theme.textMuted}24`};
  color: ${({ theme }) => theme.textSecondary};
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  backdrop-filter: blur(10px);
`;

export const HeroMeta = styled.div`
  margin-top: 1.25rem;
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

export const HeroSignalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const HeroSignalCard = styled.div`
  padding: 1.25rem;
  border-radius: 24px;
  background:
    linear-gradient(160deg, ${({ theme }) => `${theme.surfaceCard}F5`}, ${({ theme }) => `${theme.surfaceInset}F0`});
  border: 1px solid ${({ theme }) => `${theme.textMuted}20`};
  box-shadow: 0 16px 30px ${({ theme }) => `${theme.textDark}10`};
  animation: ${fadeUp} 0.55s ease both;
  ${cardHover}

  @media (max-width: 640px) {
    padding: 1rem;
    border-radius: 20px;
  }
`;

export const HeroSignalValue = styled.div`
  font-size: clamp(1.9rem, 4vw, 2.6rem);
  font-weight: 800;
  line-height: 1;
  color: ${({ theme }) => theme.textPrimary};
`;

export const HeroSignalLabel = styled.div`
  margin-top: 0.65rem;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.02em;
`;

export const FactGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 1180px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

export const FactCard = styled.div`
  padding: 1.35rem;
  border-radius: 24px;
  background: ${({ theme }) => theme.surfaceCard};
  border: 1px solid ${({ theme }) => `${theme.textMuted}1E`};
  box-shadow: 0 18px 30px ${({ theme }) => `${theme.textDark}10`};
  animation: ${fadeUp} 0.6s ease both;
  ${cardHover}

  @media (max-width: 640px) {
    padding: 1.1rem;
    border-radius: 20px;
  }
`;

export const FactHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  color: ${({ theme }) => theme.accent1};
  margin-bottom: 1rem;

  svg {
    width: 1.55rem;
    height: 1.55rem;
  }
`;

export const FactTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.textPrimary};
  font-size: 1rem;
`;

export const FactText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.textSecondary};
  line-height: 1.6;
  font-size: 0.95rem;
`;

export const DashboardGrid = styled.section`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const KpiCard = styled.div`
  padding: 1.3rem;
  border-radius: 24px;
  background:
    linear-gradient(150deg, ${({ theme }) => theme.surfaceCard}, ${({ theme }) => `${theme.surfaceInset}E8`});
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  box-shadow: 0 18px 34px ${({ theme }) => `${theme.textDark}12`};
  animation: ${fadeUp} 0.65s ease both;
  ${cardHover}

  @media (max-width: 640px) {
    padding: 1.05rem;
    border-radius: 20px;
  }
`;

export const KpiValue = styled.div`
  margin-top: 0.9rem;
  font-size: clamp(2rem, 4vw, 2.9rem);
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, ${({ theme }) => theme.accent1}, ${({ theme }) => theme.accent2}, ${({ theme }) => theme.accent3});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

export const KpiLabel = styled.div`
  color: ${({ theme }) => theme.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.78rem;
  font-weight: 800;
`;

export const KpiMeta = styled.div`
  margin-top: 0.7rem;
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.86rem;
  line-height: 1.5;
`;

export const AnalyticsRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.85fr);
  gap: 1.5rem;

  @media (max-width: 1120px) {
    grid-template-columns: 1fr;
  }
`;

export const ShareColumn = styled.div`
  display: grid;
  gap: 1.5rem;
`;

export const Panel = styled.section`
  padding: 1.45rem;
  border-radius: 30px;
  background:
    linear-gradient(155deg, ${({ theme }) => `${theme.surfaceCard}FC`}, ${({ theme }) => `${theme.surfaceInset}F0`});
  border: 1px solid ${({ theme }) => `${theme.textMuted}24`};
  box-shadow: 0 22px 42px ${({ theme }) => `${theme.textDark}14`};
  animation: ${fadeUp} 0.7s ease both;
  ${cardHover}

  @media (max-width: 640px) {
    padding: 1.1rem;
    border-radius: 22px;
  }
`;

export const PanelHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.2rem;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

export const PanelHeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
`;

export const PanelEyebrow = styled.div`
  color: ${({ theme }) => theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.72rem;
  font-weight: 800;
`;

export const PanelTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.textPrimary};
  font-size: clamp(1.15rem, 2vw, 1.55rem);
`;

export const PanelSubtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 0.95rem;
  line-height: 1.6;
`;

export const ControlRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
`;

export const SegmentedButton = styled.button<{ $active?: boolean; $tone?: "red" | "orange" | "yellow" | "neutral" }>`
  border: 1px solid ${({ theme, $active, $tone = "neutral" }) => {
    if (!$active) return `${theme.textMuted}24`;
    if ($tone === "red") return `${theme.accent1}66`;
    if ($tone === "orange") return `${theme.accent2}66`;
    if ($tone === "yellow") return `${theme.accent3}88`;
    return `${theme.accent1}55`;
  }};
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  cursor: pointer;
  color: ${({ theme, $active, $tone = "neutral" }) => {
    if (!$active) return theme.textSecondary;
    if ($tone === "yellow") return theme.textOnAccent3;
    if ($tone === "neutral") return theme.textOnAccent1;
    return theme.textOnAccent1;
  }};
  background: ${({ theme, $active, $tone = "neutral" }) => {
    if (!$active) return `${theme.surfacePage}CC`;
    if ($tone === "red") return theme.accent1;
    if ($tone === "orange") return theme.accent2;
    if ($tone === "yellow") return theme.accent3;
    return theme.accent1;
  }};
  box-shadow: ${({ theme, $active, $tone = "neutral" }) => {
    if (!$active) return "none";
    if ($tone === "red" || $tone === "neutral") return `0 12px 22px ${theme.accent1}33`;
    if ($tone === "orange") return `0 12px 22px ${theme.accent2}33`;
    return `0 12px 22px ${theme.accent3}33`;
  }};
  transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: ${({ theme, $active, $tone = "neutral" }) => {
      if ($active) return $tone === "orange" ? `${theme.accent2}77` : $tone === "yellow" ? `${theme.accent3}99` : `${theme.accent1}77`;
      return `${theme.accent1}44`;
    }};
  }
`;

export const TrendCanvas = styled.div`
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 0.2rem;
`;

export const TrendCanvasInner = styled.div`
  width: max(100%, 42rem);
  height: 20rem;

  @media (max-width: 640px) {
    width: max(100%, 34rem);
    height: 16rem;
  }
`;

export const TrendFooter = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.82rem;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

export const ShareCard = styled(Panel)`
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
`;

export const ShareBody = styled.div`
  display: grid;
  grid-template-columns: 9.5rem minmax(0, 1fr);
  gap: 1rem;
  align-items: center;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
    justify-items: center;
  }
`;

export const ShareRing = styled.div`
  width: 9.5rem;
  height: 9.5rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  position: relative;
  box-shadow: inset 0 0 0 1px ${({ theme }) => `${theme.textMuted}18`};
`;

export const ShareRingCenter = styled.div`
  width: 5.8rem;
  height: 5.8rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.surfaceCard};
  box-shadow: 0 12px 20px ${({ theme }) => `${theme.textDark}14`};
  text-align: center;
`;

export const ShareCenterValue = styled.div`
  color: ${({ theme }) => theme.textPrimary};
  font-size: 1.25rem;
  font-weight: 900;
  line-height: 1;
`;

export const ShareCenterLabel = styled.div`
  margin-top: 0.25rem;
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 800;
`;

export const LegendList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
`;

export const LegendRow = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.7rem;
  align-items: center;
`;

export const LegendSwatch = styled.span<{ $color: string }>`
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 0 6px ${({ $color }) => `${$color}22`};
`;

export const LegendLabel = styled.span`
  color: ${({ theme }) => theme.textSecondary};
  font-weight: 700;
  font-size: 0.92rem;
`;

export const LegendValue = styled.span`
  color: ${({ theme }) => theme.textPrimary};
  font-weight: 800;
  font-size: 0.92rem;
`;

export const HeatmapLayout = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 1rem;

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
`;

export const HeatmapMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-width: 13rem;

  @media (max-width: 800px) {
    min-width: 0;
  }
`;

export const HeatmapTooltip = styled.div`
  padding: 1rem;
  border-radius: 20px;
  background: ${({ theme }) => `${theme.surfacePage}D6`};
  border: 1px solid ${({ theme }) => `${theme.textMuted}1E`};
  color: ${({ theme }) => theme.textSecondary};
  font-size: 0.92rem;
  line-height: 1.55;
  backdrop-filter: blur(10px);
`;

export const HeatmapGridWrap = styled.div`
  width: 100%;
  overflow-x: auto;
  padding-bottom: 0.25rem;
`;

export const HeatmapMatrix = styled.div`
  display: grid;
  gap: 0.7rem;
  width: max(100%, 42rem);

  @media (max-width: 640px) {
    width: max(100%, 36rem);
  }
`;

export const HeatmapHours = styled.div`
  display: grid;
  grid-template-columns: repeat(24, minmax(0, 1fr));
  gap: 0.3rem;
  padding-left: 4rem;
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
`;

export const HeatmapRow = styled.div`
  display: grid;
  grid-template-columns: 3.3rem repeat(24, minmax(0, 1fr));
  gap: 0.3rem;
  align-items: center;
`;

export const HeatmapDayLabel = styled.div`
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
`;

export const HeatmapCell = styled.button<{ $active?: boolean }>`
  border: 0;
  min-height: 1.4rem;
  border-radius: 0.45rem;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
  box-shadow: ${({ theme, $active }) => ($active ? `0 0 0 1px ${theme.textOnCard} inset, 0 10px 18px ${theme.textDark}18` : "none")};

  &:hover {
    transform: translateY(-1px);
  }
`;

export const LeaderboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 1320px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const LeaderboardCard = styled(Panel)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const LeaderboardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

export const LeaderboardRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
`;

export const LeaderboardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`;

export const LeaderboardLabelWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
`;

export const LeaderboardLabel = styled.div`
  color: ${({ theme }) => theme.textPrimary};
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const LeaderboardHint = styled.div`
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.78rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const LeaderboardValue = styled.div`
  color: ${({ theme }) => theme.textSecondary};
  font-size: 0.84rem;
  font-weight: 800;
`;

export const LeaderboardTrack = styled.div`
  width: 100%;
  height: 0.56rem;
  border-radius: 999px;
  overflow: hidden;
  background: ${({ theme }) => `${theme.surfacePage}CC`};
`;

export const LeaderboardFill = styled.div<{ $width: number }>`
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, ${({ theme }) => theme.accent1}, ${({ theme }) => theme.accent2}, ${({ theme }) => theme.accent3});
  clip-path: inset(0 ${({ $width }) => `${100 - Math.max(0, Math.min(100, $width))}%`} 0 0 round 999px);
`;

export const InsightGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const InsightCard = styled.div`
  padding: 1.15rem;
  border-radius: 22px;
  background: ${({ theme }) => `${theme.surfaceCard}F7`};
  border: 1px solid ${({ theme }) => `${theme.textMuted}20`};
  box-shadow: 0 16px 28px ${({ theme }) => `${theme.textDark}0F`};
  animation: ${fadeUp} 0.8s ease both;
  ${cardHover}

  @media (max-width: 640px) {
    padding: 1rem;
    border-radius: 20px;
  }
`;

export const InsightValue = styled.div`
  color: ${({ theme }) => theme.textPrimary};
  font-size: 1.55rem;
  font-weight: 900;
  line-height: 1;
`;

export const InsightLabel = styled.div`
  margin-top: 0.55rem;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 0.87rem;
  line-height: 1.45;
  font-weight: 700;
`;

export const EmptyState = styled.div`
  padding: 1.2rem;
  border-radius: 20px;
  background: ${({ theme }) => `${theme.surfacePage}D0`};
  border: 1px dashed ${({ theme }) => `${theme.textMuted}28`};
  color: ${({ theme }) => theme.textSecondary};
  font-size: 0.92rem;
  line-height: 1.6;
`;

export const StatusCard = styled(Panel)`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

export const TrendEmptyState = styled(EmptyState)`
  display: grid;
  place-items: center;
  min-height: 14rem;
  text-align: center;

  @media (max-width: 640px) {
    min-height: 12rem;
  }
`;

export const LoadingBlock = styled.div`
  height: 1.1rem;
  border-radius: 999px;
  background: linear-gradient(90deg, ${({ theme }) => `${theme.surfacePage}00`}, ${({ theme }) => `${theme.surfacePage}CC`}, ${({ theme }) => `${theme.surfacePage}00`});
  background-size: 200% 100%;
  animation: ${shimmer} 1.6s linear infinite;
`;
