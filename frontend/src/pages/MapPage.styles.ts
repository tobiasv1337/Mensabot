import styled from "styled-components";

export { HeroCard, HeroEyebrow, HeroTitle, HeroSubtitle } from "../shared/ui/page/PageHero.styles";
export { SearchCard, SearchRow, SearchInput, SearchActions, ClearButton, SearchMeta, MetaPill } from "../shared/ui/page/PageSearch.styles";

export const ErrorCard = styled.div`
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, ${({ theme }) => `${theme.accent1}14`}, ${({ theme }) => `${theme.surfaceCard}`});
  border: 1px solid ${({ theme }) => `${theme.accent1}33`};
  color: ${({ theme }) => theme.textPrimary};
  display: grid;
  gap: 10px;
`;

export const ErrorTitle = styled.div`
  font-weight: 800;
  letter-spacing: 0.02em;
`;

export const ErrorBody = styled.div`
  color: ${({ theme }) => theme.textSecondary};
  line-height: 1.55;
  font-size: 14px;
`;

export const MapCard = styled.section`
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  background: ${({ theme }) => theme.surfaceCard};
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  box-shadow: 0 18px 36px ${({ theme }) => `${theme.textDark}1A`};
`;
