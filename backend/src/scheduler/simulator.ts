import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { processBatch } from "../modules/monitoring/service.js";

export const SIM_APIS = [
  "PatientDataAPI",
  "AppointmentAPI",
  "BillingAPI",
  "AuthAPI",
] as const;

export type FaultKind = "slow" | "error500" | "error404" | "zero" | "malformed";
export type SimKind = FaultKind | "healthy";

export interface SimPayload {
  api_name: string;
  response_time_ms: unknown;
  status_code: unknown;
  records_returned: unknown;
}

const FAULT_KINDS: FaultKind[] = [
  "slow",
  "error500",
  "error404",
  "zero",
  "malformed",
];

const faults = new Map<string, { kind: FaultKind; ticks: number }>();

export function resetFaults(): void {
  faults.clear();
}

export function buildPayload(apiName: string, kind: SimKind): SimPayload {
  switch (kind) {
    case "slow":
      return {
        api_name: apiName,
        response_time_ms: 6500,
        status_code: 200,
        records_returned: 5,
      };
    case "error500":
      return {
        api_name: apiName,
        response_time_ms: 150,
        status_code: 500,
        records_returned: 3,
      };
    case "error404":
      return {
        api_name: apiName,
        response_time_ms: 150,
        status_code: 404,
        records_returned: 3,
      };
    case "zero":
      return {
        api_name: apiName,
        response_time_ms: 150,
        status_code: 200,
        records_returned: 0,
      };
    case "malformed":
      return {
        api_name: apiName,
        response_time_ms: "slow",
        status_code: 200,
        records_returned: 3,
      };
    case "healthy":
      return {
        api_name: apiName,
        response_time_ms: 120,
        status_code: 200,
        records_returned: 5,
      };
  }
}

export async function tickOnce(
  rand: () => number = Math.random,
): Promise<void> {
  const items: SimPayload[] = [];
  for (const api of SIM_APIS) {
    const existing = faults.get(api);
    if (existing && existing.ticks > 0) {
      items.push(buildPayload(api, existing.kind));
      existing.ticks -= 1;
      if (existing.ticks <= 0) faults.delete(api);
      continue;
    }
    if (rand() < 0.2) {
      const kind =
        FAULT_KINDS[Math.floor(rand() * FAULT_KINDS.length)] ?? "slow";
      faults.set(api, { kind, ticks: 2 + Math.floor(rand() * 3) });
      items.push(buildPayload(api, kind));
    } else {
      items.push(buildPayload(api, "healthy"));
    }
  }
  const { summary } = await processBatch(items);
  logger.info("SIMULATOR_TICK", { ...summary });
}

let started = false;
let timer: NodeJS.Timeout | undefined;

export function startSimulator(): void {
  if (env.SIMULATOR_ENABLED !== "true" || started) return;
  started = true;
  timer = setInterval(() => {
    tickOnce().catch((err: unknown) =>
      logger.error("SIMULATOR_ERROR", { message: String(err) }),
    );
  }, env.SIMULATOR_INTERVAL_MS);
}

export function stopSimulator(): void {
  if (timer) clearInterval(timer);
  timer = undefined;
  started = false;
}
