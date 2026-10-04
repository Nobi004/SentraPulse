import { useCallback, useEffect, useState } from "react";
import { listAlerts } from "../../services/api.js";
import type { AlertDto, AlertFilters } from "../../types/api.js";

export function useAlerts(filters: AlertFilters) {
  const [data, setData] = useState<AlertDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const key = JSON.stringify(filters);

  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    const parsed = JSON.parse(key) as AlertFilters;

    const load = async () => {
      try {
        const res = await listAlerts(
          {
            status: parsed.status || "active",
            severity: parsed.severity,
            apiName: parsed.apiName,
          },
          controller.signal,
        );
        if (live) {
          setData(res.data);
          setError(null);
        }
      } catch (e) {
        if (live && (e as Error).name !== "AbortError")
          setError((e as Error).message);
      } finally {
        if (live) setLoading(false);
      }
    };

    load();
    const timer = setInterval(load, 10000);
    return () => {
      live = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [key, tick]);

  return { data, error, loading, refresh };
}
