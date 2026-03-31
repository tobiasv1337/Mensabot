import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getApiClient } from "@/shared/api/getApiClient";
import type { CanteenSearchResult, PageInfo } from "@/shared/api/MensaBotClient";

const PER_PAGE = 24;

type SortBy = "auto" | "distance" | "name" | "city";
type LoadingState = "initial" | "search" | "more" | null;
type UserLocation = { lat: number; lng: number } | null;

export const useCanteenSearch = (isOffline: boolean) => {
  const { t } = useTranslation();
  const client = useMemo(() => getApiClient(), []);
  const requestId = useRef(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CanteenSearchResult[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [totalResults, setTotalResults] = useState<number | null>(null);
  const [totalCanteens, setTotalCanteens] = useState<number | null>(null);
  const [totalCities, setTotalCities] = useState<number | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>("initial");
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation>(null);
  const [sortBy, setSortBy] = useState<SortBy>("auto");

  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (locationError) => {
        console.log("Location access denied or error:", locationError);
      },
    );
  }, []);

  const fetchData = useCallback(
    async (searchQuery: string, page: number, append: boolean, sort: SortBy, location: UserLocation) => {
      if (isOffline) {
        setLoadingState(null);
        setError(t("canteens.offline"));
        return;
      }

      const currentRequest = ++requestId.current;
      setLoadingState(append ? "more" : searchQuery ? "search" : "initial");
      setError(null);

      try {
        const response = await client.searchCanteens({
          query: searchQuery,
          page,
          perPage: PER_PAGE,
          nearLat: location?.lat,
          nearLng: location?.lng,
          sortBy: sort,
          minScore: 0,
        });

        if (currentRequest !== requestId.current) return;

        setItems((previous) => (append ? [...previous, ...response.results] : response.results));
        setPageInfo(response.page_info);
        setTotalResults(response.total_results);
        setTotalCanteens(response.index.total_canteens);
        setTotalCities(response.index.total_cities);
      } catch {
        if (currentRequest !== requestId.current) return;
        setError(t("canteens.error"));
      } finally {
        if (currentRequest === requestId.current) {
          setLoadingState(null);
        }
      }
    },
    [client, isOffline, t],
  );

  useEffect(() => {
    if (isOffline) {
      requestId.current += 1;
      setLoadingState(null);
      if (items.length === 0) {
        setPageInfo(null);
        setTotalResults(null);
      }
      setError(t("canteens.offline"));
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchData(query, 1, false, sortBy, userLocation);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [fetchData, isOffline, items.length, query, sortBy, t, userLocation]);

  const handleLoadMore = useCallback(() => {
    if (isOffline || !pageInfo?.next_page || loadingState) return;
    void fetchData(query, pageInfo.next_page, true, sortBy, userLocation);
  }, [fetchData, isOffline, loadingState, pageInfo?.next_page, query, sortBy, userLocation]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pageInfo?.has_next && loadingState === null) {
          handleLoadMore();
        }
      },
      { threshold: 0.5 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [handleLoadMore, loadingState, pageInfo?.has_next]);

  const handleClear = useCallback(() => {
    setQuery("");
    setError(null);
  }, []);

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
  }, []);

  const isSearching = query.trim().length > 0;
  const hasMore = pageInfo?.has_next ?? false;
  const showSkeletons = (loadingState === "initial" || loadingState === "search") && items.length === 0;

  return {
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
  };
};
