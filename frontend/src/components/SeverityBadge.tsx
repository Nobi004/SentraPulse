import type { Severity } from "../types/api.js";

const STYLES: Record<Severity, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-slate-100 text-slate-700",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${STYLES[severity]}`}
    >
      {severity}
    </span>
  );
}
