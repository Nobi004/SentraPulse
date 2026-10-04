import { detectAnomalies } from "../../domain/anomaly/anomaly-detector.js";
import { buildSignature } from "../../domain/alert/signature.js";
import { logger } from "../../config/logger.js";
import { ValidationError } from "../../errors/app-error.js";
import { recordAnomaly } from "../alerts/service.js";
import { insertObservations } from "./observation.repository.js";
import type { ObservationDoc } from "./observation.repository.js";
import { getMaxBatchSize, monitorItemSchema, toNullNumber } from "./schema.js";

export interface HealthyResult {
  apiName: string;
  status: "healthy";
}

export interface AnomalyResultItem {
  apiName: string;
  status: "anomaly";
  severity: string;
  riskScore: number;
  types: string[];
  alertId: string;
  alertAction: "created" | "updated";
}

export interface RejectedResult {
  index: number;
  status: "rejected";
  reason: string;
}

export type MonitorResultItem =
  HealthyResult | AnomalyResultItem | RejectedResult;

export interface MonitorSummary {
  processed: number;
  healthy: number;
  anomalies: number;
  rejected: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function processBatch(rawBody: unknown): Promise<{
  summary: MonitorSummary;
  results: MonitorResultItem[];
}> {
  const maxBatch = getMaxBatchSize();
  let rawItems: unknown[];
  if (Array.isArray(rawBody)) {
    if (rawBody.length === 0)
      throw new ValidationError("Monitoring payload must not be empty");
    if (rawBody.length > maxBatch)
      throw new ValidationError(`Batch too large: max ${maxBatch} items`);
    rawItems = rawBody;
  } else if (isRecord(rawBody)) {
    rawItems = [rawBody];
  } else {
    throw new ValidationError("Invalid monitoring payload");
  }

  const results: MonitorResultItem[] = [];
  const docs: ObservationDoc[] = [];
  // Parallel context for valid items: result position + detection facts
  // needed for the alert upsert once observation ids are known.
  const pendingAlerts: {
    resultPos: number;
    apiName: string;
    signature: string;
    anomalyTypes: string[];
    reasons: string[];
    severity: string;
    riskScore: number;
    metrics: {
      responseTimeMs: number | null;
      statusCode: number | null;
      recordsReturned: number | null;
    };
  }[] = [];
  let healthy = 0;
  let anomalies = 0;
  let rejected = 0;

  rawItems.forEach((raw, index) => {
    const parsed = monitorItemSchema.safeParse(raw);
    if (!parsed.success) {
      rejected += 1;
      const reason =
        isRecord(raw) &&
        typeof raw["api_name"] === "string" &&
        raw["api_name"].length > 0
          ? "api_name is invalid"
          : "api_name is required";
      results.push({ index, status: "rejected", reason });
      return;
    }

    const responseTimeMs = toNullNumber(parsed.data.response_time_ms, {
      min: 0,
    });
    const statusCode = toNullNumber(parsed.data.status_code, {
      int: true,
      min: 100,
      max: 599,
    });
    const recordsReturned = toNullNumber(parsed.data.records_returned, {
      int: true,
      min: 0,
    });
    const detection = detectAnomalies({
      apiName: parsed.data.api_name,
      responseTimeMs,
      statusCode,
      recordsReturned,
    });

    docs.push({
      apiName: parsed.data.api_name,
      responseTimeMs,
      statusCode,
      recordsReturned,
      anomalyTypes: [...detection.types],
      riskScore: detection.riskScore,
      observedAt: new Date(),
    });

    if (detection.isAnomaly) {
      anomalies += 1;
      logger.info("ANOMALY_DETECTED", {
        apiName: parsed.data.api_name,
        severity: detection.severity,
        types: detection.types,
      });
      pendingAlerts.push({
        resultPos: results.length,
        apiName: parsed.data.api_name,
        signature: buildSignature(parsed.data.api_name, [...detection.types]),
        anomalyTypes: [...detection.types],
        reasons: [...detection.reasons],
        severity: detection.severity,
        riskScore: detection.riskScore,
        metrics: { responseTimeMs, statusCode, recordsReturned },
      });
      results.push({
        apiName: parsed.data.api_name,
        status: "anomaly",
        severity: detection.severity,
        riskScore: detection.riskScore,
        types: [...detection.types],
        alertId: "",
        alertAction: "created",
      });
    } else {
      healthy += 1;
      results.push({ apiName: parsed.data.api_name, status: "healthy" });
    }
  });

  let insertedIds: { _id: unknown }[] = [];
  if (docs.length > 0) {
    insertedIds = await insertObservations(docs);
    logger.info("OBSERVATIONS_STORED", { count: docs.length });
  }

  // Alert upsert in input order: insertMany preserves order so
  // insertedIds[i] belongs to the i-th valid item.
  for (let i = 0; i < pendingAlerts.length; i++) {
    const pending = pendingAlerts[i]!;
    const observationId = String(insertedIds[i]?._id ?? "");
    const { alertId, alertAction } = await recordAnomaly({
      ...pending,
      observationId,
    });
    const item = results[pending.resultPos];
    if (item && item.status === "anomaly") {
      item.alertId = alertId;
      item.alertAction = alertAction;
    }
  }

  return {
    summary: { processed: docs.length, healthy, anomalies, rejected },
    results,
  };
}
