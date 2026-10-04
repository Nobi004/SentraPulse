import { z } from "zod";
import { env } from "../../config/env.js";

export const apiNameRegex = /^[A-Za-z0-9_.-]+$/;

export const monitorItemSchema = z.object({
  api_name: z.string().min(1).max(64).regex(apiNameRegex),
  response_time_ms: z.unknown(),
  status_code: z.unknown(),
  records_returned: z.unknown(),
});

export type MonitorItem = z.infer<typeof monitorItemSchema>;

interface NullNumberOptions {
  int?: boolean;
  min?: number;
  max?: number;
}

export function toNullNumber(
  value: unknown,
  opts: NullNumberOptions = {},
): number | null {
  const { int = false, min = 0, max = Infinity } = opts;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (int && !Number.isInteger(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

export function getMaxBatchSize(): number {
  return env.MAX_BATCH_SIZE;
}
