import { useState } from "react";
import { useAlerts } from "../features/alerts/useAlerts.js";
import { AlertTable } from "../features/alerts/AlertTable.js";
import { AlertFilters } from "../features/alerts/AlertFilters.js";
import { useStats } from "../features/stats/useStats.js";
import { StatsCards } from "../features/stats/StatsCards.js";
import { EmptyState, ErrorState, Spinner } from "../components/states.js";
import { resolveAlert } from "../services/api.js";
import type { AlertFilters as Filters } from "../types/api.js";

export function DashboardPage() {
  const [filters, setFilters] = useState<Filters>({
    severity: "",
    apiName: "",
    status: "active",
  });
  const { data, error, loading, refresh } = useAlerts(filters);
  const stats = useStats();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    setResolveError(null);
    try {
      await resolveAlert(id);
      refresh();
    } catch (e) {
      setResolveError(`Resolve failed: ${(e as Error).message}`);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <header>
        <h1 className="text-2xl font-bold">SentraPulse — API Monitoring</h1>
        <p className="text-sm text-slate-500">
          Active incidents, refreshed every 10s
        </p>
      </header>

      {stats.loading ? (
        <Spinner />
      ) : stats.error ? null : stats.stats ? (
        <StatsCards stats={stats.stats} />
      ) : null}

      <AlertFilters filters={filters} onChange={setFilters} />

      {resolveError ? (
        <div
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <span>{resolveError}</span>
          <button
            type="button"
            onClick={() => setResolveError(null)}
            className="ml-3 rounded border border-red-300 px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : data.length === 0 ? (
        <EmptyState message="No alerts — all APIs healthy." />
      ) : (
        <AlertTable
          alerts={data}
          resolvingId={resolvingId}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
}
