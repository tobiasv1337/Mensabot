import { useEffect, useMemo, useState } from "react";
import { getApiClient } from "@/shared/api/getApiClient";
import type { ProjectStatsResponse } from "@/shared/api/MensaBotClient";

export const useAnalyticsStats = (isOffline: boolean) => {
  const client = useMemo(() => getApiClient(), []);
  const [stats, setStats] = useState<ProjectStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOffline) {
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await client.getProjectStats();
        if (!cancelled) {
          setStats(response);
        }
      } catch (fetchError) {
        if (!cancelled) {
          const message = fetchError instanceof Error ? fetchError.message : "Unknown error";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchStats();

    return () => {
      cancelled = true;
    };
  }, [client, isOffline]);

  return {
    stats,
    isLoading,
    error,
  };
};
