import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Canteen, CanteenSearchResult, PageInfo } from "../services/api";
import { getApiClient } from "../services/apiClient";
import * as S from "./CanteensPage.styles";
import { Page, Content } from "./PageLayout.styles";
import { openGoogleMaps } from "../services/maps";
import { useTranslation } from "react-i18next";


const PER_PAGE = 24;

interface CanteensPageProps {
  onSelectCanteen: (canteen: Canteen) => void;
  selectedCanteenIds?: number[];
}

const CanteensPage: React.FC<CanteensPageProps> = ({
  onSelectCanteen,
  selectedCanteenIds = [],
}) => {
  const { t } = useTranslation();
  const client = useMemo(() => getApiClient(), []);
  const requestId = useRef(0);

  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CanteenSearchResult[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [totalResults, setTotalResults] = useState<number | null>(null);
  const [totalCanteens, setTotalCanteens] = useState<number | null>(null);
  const [totalCities, setTotalCities] = useState<number | null>(null);
  const [loadingState, setLoadingState] = useState<"initial" | "search" | "more" | null>("initial");
  const [error, setError] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sortBy, setSortBy] = useState<"auto" | "distance" | "name" | "city">("auto");
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log("Location access denied or error:", error);
        }
      );
    }
  }, []);

  const fetchData = useCallback(
    async (searchQuery: string, page: number, append: boolean, sort: "auto" | "distance" | "name" | "city", location: { lat: number, lng: number } | null) => {
      const currentRequest = ++requestId.current;
      if (!append) {
        setLoadingState(searchQuery ? "search" : "initial");
      } else {
        setLoadingState("more");
      }
      setError(null);

      try {
        const response = await client.searchCanteens({
          query: searchQuery,
          page: page,
          perPage: PER_PAGE,
          nearLat: location?.lat,
          nearLng: location?.lng,
          sortBy: sort,
          minScore: 0,
        });

        if (currentRequest !== requestId.current) return;

        setItems((prev) => append ? [...prev, ...response.results] : response.results);
        setPageInfo(response.page_info);
        setTotalResults(response.total_results);
        setTotalCanteens(response.index.total_canteens);
        setTotalCities(response.index.total_cities);
      } catch {
        if (currentRequest !== requestId.current) return;
        setError(t('canteens.error'));
      } finally {
        if (currentRequest === requestId.current) {
          setLoadingState(null);
        }
      }
    },
    [client]
  );

  // Initial load & search reaction
  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchData(query, 1, false, sortBy, userLocation);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, sortBy, userLocation, fetchData]);

  const handleLoadMore = useCallback(() => {
    if (!pageInfo?.next_page || loadingState) return;
    fetchData(query, pageInfo.next_page, true, sortBy, userLocation);
  }, [pageInfo?.next_page, loadingState, fetchData, query, sortBy, userLocation]);

  const isSearching = query.trim().length > 0;
  const hasMore = pageInfo?.has_next;
  const showSkeletons = (loadingState === "initial" || loadingState === "search") && items.length === 0;

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && loadingState === null) {
          handleLoadMore();
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingState, handleLoadMore]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // Search is handled by useEffect on query change
  };

  const handleClear = () => {
    setQuery("");
    setError(null);
  };

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
              onChange={(event) => setQuery(event.target.value)}
              aria-label={t('canteens.searchAriaLabel')}
            />
            <S.SearchActions>
              <S.SearchButton type="submit" disabled={loadingState === "search"}>
                {loadingState === "search" ? t('canteens.searching') : t('canteens.search')}
              </S.SearchButton>

              <S.SortSelect
                value={sortBy}
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
            <S.EmptyTitle>{t('canteens.emptyTitle')}</S.EmptyTitle>
            <S.EmptyBody>
              {t('canteens.emptyBody')}
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
