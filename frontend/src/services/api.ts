import type { AlertsResponse, StatsDto } from "../types/api.js";

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    return body.error?.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function listAlerts(
  query: Record<string, string | number>,
  signal?: AbortSignal,
): Promise<AlertsResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== "" && value !== undefined) params.set(key, String(value));
  }
  const res = await fetch(`/api/v1/alerts?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as AlertsResponse;
}

export async function getStats(
  signal?: AbortSignal,
): Promise<{ success: boolean; data: StatsDto }> {
  const res = await fetch("/api/v1/stats", { signal });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as { success: boolean; data: StatsDto };
}

export async function resolveAlert(id: string): Promise<void> {
  const res = await fetch(`/api/v1/alerts/${id}/resolve`, { method: "PATCH" });
  if (!res.ok) throw new Error(await readErrorMessage(res));
}
