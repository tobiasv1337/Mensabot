import React from "react";
import { useAppShellContext } from "../layouts/useAppShellContext";
import * as S from "./CanteensPage.styles";
import { Page, Content } from "./PageLayout.styles";
import { openGoogleMaps } from "@/shared/services/maps";
import { useTranslation } from "react-i18next";
import { useCanteenSearch } from "../features/canteens/hooks/useCanteenSearch";

const CanteensPage: React.FC = () => {
  const { t } = useTranslation();
  const { onSelectCanteen, selectedCanteenIds, isOffline } = useAppShellContext();
  const {
    query,
    setQuery,
    sortBy,
    setSortBy,
    items,
    totalResults,
    totalCanteens,
    totalCities,
    loadingState,
    error,
    observerTarget,
    isSearching,
    hasMore,
    showSkeletons,
    handleClear,
    handleSubmit,
  } = useCanteenSearch(isOffline);

  return (
    <Page>
      <Content>
        <S.Hero>
          <S.HeroCard>
            <S.HeroEyebrow>{t('canteens.eyebrow')}</S.HeroEyebrow>
            <S.HeroTitle>{t('canteens.title')}</S.HeroTitle>
            <S.HeroSubtitle>
              {t('canteens.subtitle')}
            </S.HeroSubtitle>
            <S.HeroHighlights>
              <S.HighlightTag>{t('canteens.tagSearch')}</S.HighlightTag>
              <S.HighlightTag>{t('canteens.tagOpenmensa')}</S.HighlightTag>
              <S.HighlightTag>{t('canteens.tagLocations')}</S.HighlightTag>
            </S.HeroHighlights>
          </S.HeroCard>

          <S.StatsCard>
            <S.StatGrid>
              <S.StatBlock>
                <S.StatNumber>{totalCanteens ?? "--"}</S.StatNumber>
                <S.StatLabel>{t('canteens.statsTotal')}</S.StatLabel>
              </S.StatBlock>
              <S.StatBlock>
                <S.StatNumber>{totalCities ?? "--"}</S.StatNumber>
                <S.StatLabel>{t('canteens.statsCities')}</S.StatLabel>
              </S.StatBlock>
              {isSearching && (
                <S.StatBlock>
                  <S.StatNumber>{totalResults ?? "--"}</S.StatNumber>
                  <S.StatLabel>{t('canteens.statsHits')}</S.StatLabel>
                </S.StatBlock>
              )}
            </S.StatGrid>
          </S.StatsCard>
        </S.Hero>

        <S.SearchCard onSubmit={handleSubmit}>
          <S.SearchRow>
            <S.SearchInput
              type="search"
              placeholder={t('canteens.searchPlaceholder')}
              value={query}
              disabled={isOffline}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={t('canteens.searchAriaLabel')}
            />
            <S.SearchActions>
              <S.SearchButton type="submit" disabled={isOffline || loadingState === "search"}>
                {loadingState === "search" ? t('canteens.searching') : t('canteens.search')}
              </S.SearchButton>

              <S.SortSelect
                value={sortBy}
                disabled={isOffline}
                onChange={(e) => setSortBy(e.target.value as "auto" | "distance" | "name" | "city")}
                aria-label="Sortieren nach"
              >
                <option value="auto">{t('canteens.sortRecommended')}</option>
                <option value="name">{t('canteens.sortName')}</option>
                <option value="city">{t('canteens.sortCity')}</option>
                <option value="distance">{t('canteens.sortDistance')}</option>
              </S.SortSelect>

              {query.trim().length > 0 && (
                <S.ClearButton type="button" onClick={handleClear}>
                  Reset
                </S.ClearButton>
              )}
            </S.SearchActions>
          </S.SearchRow>
          <S.SearchMeta>
            <span>
              {isSearching ? t('canteens.searchingFor', { query: query.trim() }) : ""}
            </span>
            {loadingState === "more" && <S.MetaPill>{t('canteens.loadingMore')}</S.MetaPill>}
          </S.SearchMeta>
        </S.SearchCard>

        {error && <S.ErrorBanner role="alert">{error}</S.ErrorBanner>}

        <S.ResultsHeader>
          <S.ResultsTitle>
            {isSearching ? t('canteens.searchResults') : t('canteens.allCanteens')}
          </S.ResultsTitle>
          <S.ResultsMeta>
            {totalResults} {t('canteens.found')}
          </S.ResultsMeta>
        </S.ResultsHeader>

        {showSkeletons ? (
          <S.SkeletonGrid>
            {Array.from({ length: 6 }).map((_, index) => (
              <S.SkeletonCard key={`skeleton-${index}`} />
            ))}
          </S.SkeletonGrid>
        ) : items.length === 0 ? (
          <S.EmptyState>
            <S.EmptyTitle>{isOffline ? t('canteens.offlineTitle') : t('canteens.emptyTitle')}</S.EmptyTitle>
            <S.EmptyBody>
              {isOffline ? t('canteens.offlineBody') : t('canteens.emptyBody')}
            </S.EmptyBody>
          </S.EmptyState>
        ) : (
          <S.CanteenGrid>
            {items.map((result, index) => {
              const { canteen, distance_km } = result;
              const showDistance = distance_km !== undefined;
              return (
                <S.CanteenCard
                  key={canteen.id}
                  onClick={() => onSelectCanteen(canteen)}
                  $selected={selectedCanteenIds.includes(canteen.id)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedCanteenIds.includes(canteen.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onSelectCanteen(canteen);
                    }
                  }}
                  style={{ animationDelay: `${Math.min(index * 0.03, 0.45)}s` }}
                >
                  <S.CardHeader>
                    <div>
                      <S.CardTitle>{canteen.name}</S.CardTitle>
                      <S.CardCity>{canteen.city}</S.CardCity>
                      <S.CardAddress>{canteen.address}</S.CardAddress>
                    </div>
                    {selectedCanteenIds.includes(canteen.id) && (
                      <S.CardTag>{t('canteens.selected')}</S.CardTag>
                    )}
                  </S.CardHeader>

                  <S.CardFooter>
                    <S.ActionLabel>{t('canteens.startChat')}</S.ActionLabel>
                    <S.FooterRight>
                      {showDistance && (
                        <S.DistancePill
                          onClick={(e) => canteen.lat && canteen.lng && openGoogleMaps(canteen.lat, canteen.lng, e)}
                          $clickable={!!(canteen.lat && canteen.lng)}
                          title={t('canteens.routeTitle')}
                        >
                          <span>{distance_km?.toFixed(1)} km</span>
                          <span style={{ opacity: 0.3, fontSize: "1.2em", fontWeight: 300 }}>|</span>
                          <span>{t('canteens.route')} ↗</span>
                        </S.DistancePill>
                      )}
                    </S.FooterRight>
                  </S.CardFooter>
                </S.CanteenCard>
              );
            })}
          </S.CanteenGrid>
        )}

        {hasMore && (
          <div ref={observerTarget} style={{ height: "20px", width: "100%" }} />
        )}
        {loadingState === "more" && (
          <S.LoadMoreButton disabled>
            {t('canteens.loadingMore')}
          </S.LoadMoreButton>
        )}
      </Content>
    </Page>
  );
};

export default CanteensPage;
