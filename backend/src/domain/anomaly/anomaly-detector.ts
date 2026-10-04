import { ANOMALY_SCORES, resolveThresholds } from "./anomaly-rules.js";
import { getSeverity } from "./severity.js";
import type {
  AnomalyResult,
  AnomalyType,
  DetectorConfig,
  RawObservation,
} from "./types.js";

export function detectAnomalies(
  observation: RawObservation,
  cfg?: Partial<DetectorConfig>,
): AnomalyResult {
  const { highResponseTimeMs, veryHighResponseTimeMs } = resolveThresholds(cfg);
  const types: AnomalyType[] = [];
  const reasons: string[] = [];
  let riskScore = 0;

  const flagMalformed = (field: string): void => {
    if (!types.includes("MALFORMED_RESPONSE")) {
      types.push("MALFORMED_RESPONSE");
      riskScore += ANOMALY_SCORES.MALFORMED_RESPONSE;
    }
    reasons.push(`malformed ${field}`);
  };

  if (
    observation.responseTimeMs == null ||
    !Number.isFinite(observation.responseTimeMs) ||
    observation.responseTimeMs < 0
  ) {
    flagMalformed("response_time_ms");
  } else if (observation.responseTimeMs >= veryHighResponseTimeMs) {
    types.push("HIGH_RESPONSE_TIME");
    riskScore += ANOMALY_SCORES.VERY_HIGH_RESPONSE_TIME;
    reasons.push(`response time ${observation.responseTimeMs} ms`);
  } else if (observation.responseTimeMs >= highResponseTimeMs) {
    types.push("HIGH_RESPONSE_TIME");
    riskScore += ANOMALY_SCORES.HIGH_RESPONSE_TIME;
    reasons.push(`response time ${observation.responseTimeMs} ms`);
  }

  if (
    observation.statusCode == null ||
    !Number.isInteger(observation.statusCode) ||
    observation.statusCode < 100 ||
    observation.statusCode > 599
  ) {
    flagMalformed("status_code");
  } else if (observation.statusCode >= 500) {
    types.push("HTTP_SERVER_ERROR");
    riskScore += ANOMALY_SCORES.HTTP_SERVER_ERROR;
    reasons.push(`HTTP ${observation.statusCode}`);
  } else if (observation.statusCode >= 400) {
    types.push("HTTP_CLIENT_ERROR");
    riskScore += ANOMALY_SCORES.HTTP_CLIENT_ERROR;
    reasons.push(`HTTP ${observation.statusCode}`);
  } else if (observation.statusCode < 200 || observation.statusCode >= 300) {
    types.push("UNEXPECTED_STATUS");
    riskScore += ANOMALY_SCORES.UNEXPECTED_STATUS;
    reasons.push(`HTTP ${observation.statusCode}`);
  }

  if (
    observation.recordsReturned == null ||
    !Number.isInteger(observation.recordsReturned) ||
    observation.recordsReturned < 0
  ) {
    flagMalformed("records_returned");
  } else if (observation.recordsReturned === 0) {
    types.push("ZERO_RECORDS");
    riskScore += ANOMALY_SCORES.ZERO_RECORDS;
    reasons.push("zero records returned");
  }

  return {
    isAnomaly: types.length > 0,
    types,
    reasons,
    riskScore,
    severity: getSeverity(riskScore),
  };
}
