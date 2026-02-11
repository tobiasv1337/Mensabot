import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Canteen, CanteenSearchResult, PageInfo } from "../services/api";
import { getApiClient } from "../services/apiClient";
import * as S from "./CanteensPage.styles";
import { Page, Content } from "./PageLayout.styles";
import { openGoogleMaps } from "../services/maps";


const PER_PAGE = 24;

interface CanteensPageProps {
  onSelectCanteen: (canteen: Canteen) => void;
  selectedCanteenIds?: number[];
}

const CanteensPage: React.FC<CanteensPageProps> = ({
  onSelectCanteen,
  selectedCanteenIds = [],
}) => {
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
        setError("Mensen konnten nicht geladen werden. Bitte versuche es erneut.");
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
            <S.HeroEyebrow>Mensa Auswahl</S.HeroEyebrow>
            <S.HeroTitle>Mensen entdecken</S.HeroTitle>
            <S.HeroSubtitle>
              Finde deine Mensa, starte einen neuen Chat und frage direkt nach
              Speiseplänen, Öffnungszeiten oder Preisen.
            </S.HeroSubtitle>
            <S.HeroHighlights>
              <S.HighlightTag>Schnelle Suche</S.HighlightTag>
              <S.HighlightTag>Openmensa</S.HighlightTag>
              <S.HighlightTag>1000+ Standorte</S.HighlightTag>
            </S.HeroHighlights>
          </S.HeroCard>

          <S.StatsCard>
            <S.StatGrid>
              <S.StatBlock>
                <S.StatNumber>{totalCanteens ?? "--"}</S.StatNumber>
                <S.StatLabel>Mensen Gesamt</S.StatLabel>
              </S.StatBlock>
              <S.StatBlock>
                <S.StatNumber>{totalCities ?? "--"}</S.StatNumber>
                <S.StatLabel>Städte</S.StatLabel>
              </S.StatBlock>
              {isSearching && (
                <S.StatBlock>
                  <S.StatNumber>{totalResults ?? "--"}</S.StatNumber>
                  <S.StatLabel>Treffer</S.StatLabel>
                </S.StatBlock>
              )}
            </S.StatGrid>
          </S.StatsCard>
        </S.Hero>

        <S.SearchCard onSubmit={handleSubmit}>
          <S.SearchRow>
            <S.SearchInput
              type="search"
              placeholder="Mensa oder Stadt eingeben"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Suche nach Mensen"
            />
            <S.SearchActions>
              <S.SearchButton type="submit" disabled={loadingState === "search"}>
                {loadingState === "search" ? "Suche..." : "Suchen"}
              </S.SearchButton>

              <S.SortSelect
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "auto" | "distance" | "name" | "city")}
                aria-label="Sortieren nach"
              >
                <option value="auto">Empfohlen</option>
                <option value="name">Name</option>
                <option value="city">Stadt</option>
                <option value="distance">Entfernung</option>
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
              {isSearching ? `Suche nach "${query.trim()}"` : ""}
            </span>
            {loadingState === "more" && <S.MetaPill>Lädt mehr ...</S.MetaPill>}
          </S.SearchMeta>
        </S.SearchCard>

        {error && <S.ErrorBanner role="alert">{error}</S.ErrorBanner>}

        <S.ResultsHeader>
          <S.ResultsTitle>
            {isSearching ? "Suchergebnisse" : "Alle Mensen"}
          </S.ResultsTitle>
          <S.ResultsMeta>
            {totalResults} gefunden
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
            <S.EmptyTitle>Keine Mensen gefunden</S.EmptyTitle>
            <S.EmptyBody>
              Passe deine Suche an oder prüfe, ob der Name korrekt ist.
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
                      <S.CardTag>Ausgewählt</S.CardTag>
                    )}
                  </S.CardHeader>

                  <S.CardFooter>
                    <S.ActionLabel>Chat starten</S.ActionLabel>
                    <S.FooterRight>
                      {showDistance && (
                        <S.DistancePill
                          onClick={(e) => canteen.lat && canteen.lng && openGoogleMaps(canteen.lat, canteen.lng, e)}
                          $clickable={!!(canteen.lat && canteen.lng)}
                          title="Route in Google Maps öffnen"
                        >
                          <span>{distance_km?.toFixed(1)} km</span>
                          <span style={{ opacity: 0.3, fontSize: "1.2em", fontWeight: 300 }}>|</span>
                          <span>Route ↗</span>
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
            Lädt mehr ...
          </S.LoadMoreButton>
        )}
      </Content>
    </Page>
  );
};

export default CanteensPage;
