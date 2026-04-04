import { useEffect, useMemo, useState } from "react";
import { getApiClient } from "@/shared/api/getApiClient";

export const useProjectStats = (isOffline: boolean) => {
  const client = useMemo(() => getApiClient(), []);
  const [totalCanteens, setTotalCanteens] = useState<number | null>(null);
  const [totalCities, setTotalCities] = useState<number | null>(null);

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
    totalCanteens,
    totalCities,
  };
};
