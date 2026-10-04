import { useEffect, useState } from "react";
import { getStats } from "../../services/api.js";
import type { StatsDto } from "../../types/api.js";

export function useStats() {
  const [stats, setStats] = useState<StatsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let live = true;

    const load = async () => {
      try {
        const res = await getStats(controller.signal);
        if (live) {
          setStats(res.data);
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
  }, []);

  return { stats, error, loading };
}
