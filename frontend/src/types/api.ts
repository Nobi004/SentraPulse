export type Severity = "low" | "medium" | "high" | "critical";
export type AlertStatus = "active" | "resolved";
export type MessageSource = "ai" | "fallback";

export interface AlertMetrics {
  responseTimeMs: number | null;
  statusCode: number | null;
  recordsReturned: number | null;
}

export interface AlertDto {
  _id: string;
  apiName: string;
  severity: Severity;
  status: AlertStatus;
  anomalyTypes: string[];
  message: string;
  messageSource: MessageSource;
  occurrenceCount: number;
  lastSeenAt: string;
  metrics: AlertMetrics;
}

export interface AlertsResponse {
  success: boolean;
  data: AlertDto[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface StatsDto {
  totalObservations: number;
  activeAlerts: number;
  criticalAlerts: number;
  avgResponseTimeMs: number | null;
}

export interface AlertFilters {
  severity: string;
  apiName: string;
  status: string;
}
