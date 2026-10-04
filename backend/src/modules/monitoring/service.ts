import { detectAnomalies } from "../../domain/anomaly/anomaly-detector.js";
import { buildSignature } from "../../domain/alert/signature.js";
import type {
  AlertGenerationInput,
  AlertGenerator,
} from "../../domain/alert/alert-generator.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { ValidationError } from "../../errors/app-error.js";
import { createAlertGenerator } from "../../ai/create-generator.js";
import { GEMINI_MODEL } from "../../ai/gemini-alert-generator.js";
import { PROMPT_VERSION } from "../../ai/prompts.js";
import { validateOutput } from "../../ai/output-validator.js";
import pLimit from "p-limit";
import { recordAnomaly, autoResolveApi } from "../alerts/service.js";
import { Alert } from "../alerts/alert.model.js";
import { insertObservations, getBaseline } from "./observation.repository.js";
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

export async function processBatch(
  rawBody: unknown,
  opts?: { generator?: AlertGenerator | null },
): Promise<{
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
  // Ordered per-item steps for valid items: alert upserts and auto-resolves
  // must run in input order so mixed batches (e.g. [bad-A, healthy-A])
  // end in the state the last item dictates.
  const steps: (
    | {
        kind: "anomaly";
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
      }
    | { kind: "healthy"; apiName: string }
  )[] = [];
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
      steps.push({
        kind: "anomaly",
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
      steps.push({ kind: "healthy", apiName: parsed.data.api_name });
      results.push({ apiName: parsed.data.api_name, status: "healthy" });
    }
  });

  let insertedIds: { _id: unknown }[] = [];
  if (docs.length > 0) {
    insertedIds = await insertObservations(docs);
    logger.info("OBSERVATIONS_STORED", { count: docs.length });
  }

  // Alert upserts + auto-resolves in input order: insertMany preserves
  // order so insertedIds[i] belongs to the i-th valid item, and steps
  // are pushed in the same order docs are pushed.
  const newAlerts: { alertId: string; input: AlertGenerationInput }[] = [];
  let validCursor = 0;
  for (const step of steps) {
    const observationId = String(insertedIds[validCursor]?._id ?? "");
    validCursor += 1;
    if (step.kind === "anomaly") {
      const { alertId, alertAction } = await recordAnomaly({
        apiName: step.apiName,
        signature: step.signature,
        anomalyTypes: step.anomalyTypes,
        reasons: step.reasons,
        severity: step.severity,
        riskScore: step.riskScore,
        metrics: step.metrics,
        observationId,
      });
      const item = results[step.resultPos];
      if (item && item.status === "anomaly") {
        item.alertId = alertId;
        item.alertAction = alertAction;
      }
      if (alertAction === "created") {
        newAlerts.push({
          alertId,
          input: {
            apiName: step.apiName,
            severity: step.severity,
            anomalyTypes: step.anomalyTypes,
            reasons: step.reasons,
            metrics: step.metrics,
          },
        });
      }
      await autoResolveApi(step.apiName, step.signature);
    } else {
      await autoResolveApi(step.apiName, null);
    }
  }

  // LLM explanations for NEW alerts only: bounded count + concurrency,
  // per-alert try/catch so an AI failure never fails the request.
  const generator =
    opts && "generator" in opts ? opts.generator : createAlertGenerator();
  if (generator && newAlerts.length > 0) {
    const batch = newAlerts.slice(0, env.LLM_MAX_PER_REQUEST);
    const limit = pLimit(env.LLM_CONCURRENCY);
    await Promise.all(
      batch.map((entry) =>
        limit(async () => {
          try {
            const context = await getBaseline(entry.input.apiName);
            const text = await generator.generate({ ...entry.input, context });
            if (!validateOutput(text, entry.input))
              throw new Error("INVALID_OUTPUT");
            await Alert.updateOne(
              { _id: entry.alertId },
              {
                message: text,
                messageSource: "ai",
                model: GEMINI_MODEL,
                promptVersion: PROMPT_VERSION,
              },
            );
            logger.info("AI_ALERT_GENERATED", { alertId: entry.alertId });
          } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            logger.warn(
              reason === "INVALID_OUTPUT"
                ? "FALLBACK_ALERT_USED"
                : "AI_PROVIDER_ERROR",
              { alertId: entry.alertId, reason },
            );
          }
        }),
      ),
    );
  }

  return {
    summary: { processed: docs.length, healthy, anomalies, rejected },
    results,
  };
}
