import { useEffect, useMemo, useRef, useState } from "react";
import { getApiClient } from "@/shared/api/getApiClient";

export const useProjectStats = (isOffline: boolean) => {
  const client = useMemo(() => getApiClient(), []);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lowerRef = useRef<HTMLElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [totalCanteens, setTotalCanteens] = useState<number | null>(null);
  const [totalCities, setTotalCities] = useState<number | null>(null);

  useEffect(() => {
    const checkHeight = () => {
      if (!wrapperRef.current || !lowerRef.current) return;

      const wrapperHeight = wrapperRef.current.scrollHeight;
      const lowerHeight = lowerRef.current.scrollHeight;
      setIsFullScreen(wrapperHeight + lowerHeight > window.innerHeight);
    };

    checkHeight();
    window.addEventListener("resize", checkHeight);

    return () => window.removeEventListener("resize", checkHeight);
  }, [totalCanteens, totalCities]);

  useEffect(() => {
    if (isOffline) return;

    const fetchStats = async () => {
      try {
        const response = await client.searchCanteens({
          query: "",
          page: 1,
          perPage: 1,
        });
        setTotalCanteens(response.index.total_canteens);
        setTotalCities(response.index.total_cities);
      } catch (error) {
        console.error("Failed to fetch project stats:", error);
      }
    };

    void fetchStats();
  }, [client, isOffline]);

  return {
    wrapperRef,
    lowerRef,
    isFullScreen,
    totalCanteens,
    totalCities,
  };
};
