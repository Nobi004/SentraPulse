export type AnomalyType =
  | "HIGH_RESPONSE_TIME"
  | "HTTP_CLIENT_ERROR"
  | "HTTP_SERVER_ERROR"
  | "UNEXPECTED_STATUS"
  | "ZERO_RECORDS"
  | "MALFORMED_RESPONSE";

export type Severity = "none" | "low" | "medium" | "high" | "critical";

export interface RawObservation {
  apiName: string;
  responseTimeMs: number | null;
  statusCode: number | null;
  recordsReturned: number | null;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  types: AnomalyType[];
  reasons: string[];
  riskScore: number;
  severity: Severity;
}

export interface DetectorConfig {
  highResponseTimeMs: number;
  veryHighResponseTimeMs: number;
}
