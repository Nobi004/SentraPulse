import type { AlertFilters } from "../../types/api.js";

interface Props {
  filters: AlertFilters;
  onChange: (next: AlertFilters) => void;
}

export function AlertFilters({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <label className="flex items-center gap-2 text-sm">
        Severity
        <select
          aria-label="Severity"
          value={filters.severity}
          onChange={(e) => onChange({ ...filters, severity: e.target.value })}
          className="rounded border px-2 py-1"
        >
          <option value="">All</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        API
        <input
          aria-label="API name"
          type="text"
          value={filters.apiName}
          onChange={(e) => onChange({ ...filters, apiName: e.target.value })}
          placeholder="apiName…"
          className="rounded border px-2 py-1"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        Status
        <select
          aria-label="Status"
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          className="rounded border px-2 py-1"
        >
          <option value="active">active</option>
          <option value="resolved">resolved</option>
          <option value="all">all</option>
        </select>
      </label>
    </div>
  );
}
