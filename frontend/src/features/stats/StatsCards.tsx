import type { StatsDto } from "../../types/api.js";

function fmtAvg(value: number | null): string {
  return value === null || value === undefined
    ? "—"
    : `${Math.round(value)} ms`;
}

export function StatsCards({ stats }: { stats: StatsDto }) {
  const cards = [
    { label: "Requests (24h)", value: String(stats.totalObservations) },
    { label: "Active alerts", value: String(stats.activeAlerts) },
    { label: "Critical alerts", value: String(stats.criticalAlerts) },
    { label: "Avg latency", value: fmtAvg(stats.avgResponseTimeMs) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded border bg-white p-4">
          <div className="text-xs text-slate-500">{c.label}</div>
          <div className="text-2xl font-bold">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
