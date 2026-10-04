import { SeverityBadge } from "../../components/SeverityBadge.js";
import { SourceBadge } from "../../components/SourceBadge.js";
import type { AlertDto } from "../../types/api.js";

interface Props {
  alerts: AlertDto[];
  resolvingId: string | null;
  onResolve: (id: string) => void;
}

function fmt(value: number | null, suffix: string): string {
  return value === null || value === undefined ? "—" : `${value} ${suffix}`;
}

export function AlertTable({ alerts, resolvingId, onResolve }: Props) {
  return (
    <div className="overflow-x-auto rounded border">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-3 py-2">API</th>
            <th className="px-3 py-2">Severity</th>
            <th className="px-3 py-2">Code</th>
            <th className="px-3 py-2">Latency</th>
            <th className="px-3 py-2">Records</th>
            <th className="px-3 py-2">Message</th>
            <th className="px-3 py-2">Occ.</th>
            <th className="px-3 py-2">Last seen</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a._id} className="border-t">
              <td className="px-3 py-2 font-medium">{a.apiName}</td>
              <td className="px-3 py-2">
                <SeverityBadge severity={a.severity} />
              </td>
              <td className="px-3 py-2">{a.metrics.statusCode ?? "—"}</td>
              <td className="px-3 py-2">
                {fmt(a.metrics.responseTimeMs, "ms")}
              </td>
              <td className="px-3 py-2">{a.metrics.recordsReturned ?? "—"}</td>
              <td className="px-3 py-2">
                <div>{a.message}</div>
                <div className="mt-1">
                  <SourceBadge source={a.messageSource} />
                </div>
              </td>
              <td className="px-3 py-2">{a.occurrenceCount}</td>
              <td className="px-3 py-2">
                {new Date(a.lastSeenAt).toLocaleString()}
              </td>
              <td className="px-3 py-2">{a.status}</td>
              <td className="px-3 py-2">
                {a.status === "active" ? (
                  <button
                    type="button"
                    onClick={() => onResolve(a._id)}
                    disabled={resolvingId === a._id}
                    className="rounded bg-slate-800 px-2 py-1 text-xs text-white disabled:opacity-50"
                  >
                    {resolvingId === a._id ? "…" : "Resolve"}
                  </button>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
