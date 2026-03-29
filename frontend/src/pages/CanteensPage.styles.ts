import styled, { keyframes } from "styled-components";
export { HeroCard, HeroEyebrow, HeroTitle, HeroSubtitle } from "../shared/ui/page/PageHero.styles";
export { SearchCard, SearchRow, SearchInput, SearchActions, ClearButton, SearchMeta, MetaPill } from "../shared/ui/page/PageSearch.styles";

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

const shimmer = keyframes`
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 100% 50%;
  }
`;

export const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.9fr);
  gap: 20px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

export const HeroHighlights = styled.div`
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

export const HighlightTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: ${({ theme }) => theme.surfacePage};
  color: ${({ theme }) => theme.textOnPage};
  font-size: 12px;
  font-weight: 600;
  border: 1px solid ${({ theme }) => `${theme.textMuted}26`};
`;

export const StatsCard = styled.div`
  padding: 24px;
  border-radius: 24px;
  background: ${({ theme }) => theme.surfacePage};
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  box-shadow: 0 18px 36px ${({ theme }) => `${theme.textDark}1A`};
  display: grid;
  gap: 16px;
`;

export const StatGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  align-items: center;
`;

export const StatBlock = styled.div`
  display: grid;
  gap: 6px;
`;

export const StatNumber = styled.div`
  font-size: 26px;
  font-weight: 700;
  color: ${({ theme }) => theme.textPrimary};
`;

export const StatLabel = styled.div`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: ${({ theme }) => theme.textMuted};
`;

export const StatText = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.textSecondary};
`;

export const SearchButton = styled.button`
  padding: 10px 16px;
  border-radius: 12px;
  background: ${({ theme }) => theme.accent1};
  color: ${({ theme }) => theme.textOnAccent1};
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 22px ${({ theme }) => `${theme.accent1}33`};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const SortSelect = styled.select`
  height: 40px;
  min-height: 40px;
  padding: 0 40px 0 14px;
  border-radius: 12px;
  background-color: ${({ theme }) => theme.surfaceInset};
  color: ${({ theme }) => theme.textOnInset};
  font-size: 13px;
  font-weight: 600;
  border: 1px solid ${({ theme }) => `${theme.textMuted}33`};
  cursor: pointer;
  line-height: 1.1;
  font-family: inherit;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, ${({ theme }) => theme.textMuted} 50%),
    linear-gradient(135deg, ${({ theme }) => theme.textMuted} 50%, transparent 50%);
  background-position:
    calc(100% - 20px) 55%,
    calc(100% - 14px) 55%;
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;

  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => theme.accent2};
    box-shadow: 0 0 0 3px ${({ theme }) => `${theme.accent2}33`};
  }

  @media (max-width: 480px) {
    font-size: 16px;
  }
`;

export const ResultsHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
`;

export const ResultsTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  color: ${({ theme }) => theme.textPrimary};
`;

export const ResultsMeta = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.textSecondary};
`;

export const ErrorBanner = styled.div`
  padding: 12px 14px;
  border-radius: 12px;
  background: ${({ theme }) => `${theme.accent1}22`};
  color: ${({ theme }) => theme.textPrimary};
  border: 1px solid ${({ theme }) => `${theme.accent1}55`};
`;

export const CanteenGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
`;

export const CanteenCard = styled.div<{ $selected?: boolean }>`
  all: unset;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  border-radius: 18px;
  background: ${({ theme, $selected }) =>
    $selected
      ? `linear-gradient(135deg, ${theme.accent1}20, ${theme.surfaceCard})`
      : theme.surfaceCard};
  border: 1px solid
    ${({ theme, $selected }) =>
    $selected ? `${theme.accent1}88` : `${theme.textMuted}22`};
  box-shadow: 0 14px 28px ${({ theme }) => `${theme.textDark}14`};
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  animation: ${fadeUp} 0.35s ease both;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 18px 34px ${({ theme }) => `${theme.textDark}22`};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent2};
    outline-offset: 2px;
  }
`;

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;

  & > div:first-child {
    flex: 1;
    min-width: 0;
  }
`;

export const CardTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.textOnCard};
`;

export const CardCity = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.textPrimary};
  margin-top: 4px;
`;

export const CardAddress = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.textSecondary};
  margin-top: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.8;
  max-width: 100%;
`;

export const CardTag = styled.span`
  padding: 4px 10px;
  border-radius: 999px;
  background: ${({ theme }) => theme.surfaceInset};
  color: ${({ theme }) => theme.textOnInset};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const CardBody = styled.div`
  display: grid;
  gap: 8px;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 13px;
`;

export const CardMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const CardMetaPill = styled.span`
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  background: ${({ theme }) => theme.surfaceInset};
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.textOnInset};
`;

export const FooterRight = styled.div`
  margin-left: auto;
`;

export const DistancePill = styled.button<{ $clickable?: boolean }>`
  all: unset;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: ${({ theme }) => theme.surfaceInset};
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.textOnInset};
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
  transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;

  ${({ $clickable, theme }) =>
    $clickable &&
    `
    &:hover {
      background: ${theme.surfaceCard};
      border-color: ${theme.accent1};
      transform: translateY(-1px);
      color: ${theme.textPrimary};
      box-shadow: 0 4px 12px ${theme.accent1}33;
    }
  `}
`;

export const CardFooter = styled.div`
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

export const ActionLabel = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.surfaceAccent};
  color: ${({ theme }) => theme.textOnAccent};
  padding: 8px 16px;
  border-radius: 99px;
  font-size: 13px;
  font-weight: 600;
  transition: background-color 0.2s ease, transform 0.2s ease;
  
  ${CanteenCard}:hover & {
    background: ${({ theme }) => theme.accent1};
    color: ${({ theme }) => theme.textOnAccent1};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${({ theme }) => `${theme.accent1}40`};
  }
`;

export const SecondaryMeta = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.textSecondary};
`;

export const SkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
`;

export const SkeletonCard = styled.div`
  height: 160px;
  border-radius: 18px;
  background: linear-gradient(
    120deg,
    ${({ theme }) => `${theme.surfaceCard}66`},
    ${({ theme }) => `${theme.surfaceInset}AA`},
    ${({ theme }) => `${theme.surfaceCard}66`}
  );
  background-size: 200% 200%;
  animation: ${shimmer} 1.5s ease infinite;
`;

export const EmptyState = styled.div`
  padding: 24px;
  border-radius: 18px;
  background: ${({ theme }) => theme.surfaceCard};
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  display: grid;
  gap: 10px;
  text-align: center;
`;

export const EmptyTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.textOnCard};
`;

export const EmptyBody = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.textSecondary};
`;

export const LoadMoreButton = styled.button`
  align-self: center;
  padding: 10px 18px;
  border-radius: 14px;
  background: ${({ theme }) => theme.surfaceAccent};
  color: ${({ theme }) => theme.textOnAccent};
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 12px 20px ${({ theme }) => `${theme.textDark}1A`};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
