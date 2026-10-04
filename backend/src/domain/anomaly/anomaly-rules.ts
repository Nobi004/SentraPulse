import { env } from "../../config/env.js";
import type { DetectorConfig } from "./types.js";

export const ANOMALY_SCORES = {
  HIGH_RESPONSE_TIME: 2,
  VERY_HIGH_RESPONSE_TIME: 3,
  HTTP_CLIENT_ERROR: 2,
  HTTP_SERVER_ERROR: 5,
  UNEXPECTED_STATUS: 1,
  ZERO_RECORDS: 2,
  MALFORMED_RESPONSE: 3,
} as const;

export function resolveThresholds(
  overrides: Partial<DetectorConfig> = {},
): DetectorConfig {
  return {
    highResponseTimeMs:
      overrides.highResponseTimeMs ?? env.HIGH_RESPONSE_TIME_MS,
    veryHighResponseTimeMs:
      overrides.veryHighResponseTimeMs ?? env.VERY_HIGH_RESPONSE_TIME_MS,
  };
}
