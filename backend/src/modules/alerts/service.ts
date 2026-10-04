import mongoose from "mongoose";
import { z } from "zod";
import { logger } from "../../config/logger.js";
import { NotFoundError, ValidationError } from "../../errors/app-error.js";
import { buildFallbackMessage } from "../../domain/alert/fallback-message.js";
import { Alert } from "./alert.model.js";
import { upsertAlert } from "./alert.repository.js";

export interface AnomalyForAlert {
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
  observationId: string;
}

const listQuerySchema = z.object({
  status: z.enum(["active", "resolved", "all"]).default("active"),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  apiName: z.string().min(1).max(64).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function recordAnomaly(input: AnomalyForAlert): Promise<{
  alertId: string;
  alertAction: "created" | "updated";
}> {
  const message = buildFallbackMessage({
    apiName: input.apiName,
    severity: input.severity,
    reasons: input.reasons,
  });
  const { alertId, created } = await upsertAlert({
    apiName: input.apiName,
    signature: input.signature,
    anomalyTypes: input.anomalyTypes,
    reasons: input.reasons,
    severity: input.severity,
    riskScore: input.riskScore,
    metrics: input.metrics,
    message,
    firstObservationId: input.observationId,
    lastObservationId: input.observationId,
  });
  logger.info(created ? "ALERT_CREATED" : "ALERT_UPDATED", {
    alertId,
    apiName: input.apiName,
  });
  return { alertId, alertAction: created ? "created" : "updated" };
}

export async function listAlerts(rawQuery: unknown): Promise<{
  data: unknown[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  const parsed = listQuerySchema.safeParse(rawQuery ?? {});
  if (!parsed.success) throw new ValidationError("Invalid alerts query");
  const { status, severity, apiName, page, limit } = parsed.data;

  const filter: Record<string, unknown> = {};
  if (status !== "all") filter.status = status;
  if (severity) filter.severity = severity;
  if (apiName) filter.apiName = apiName;

  const [total, docs] = await Promise.all([
    Alert.countDocuments(filter),
    Alert.find(filter)
      .sort({ detectedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);
  return {
    data: docs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function resolveAlert(id: string): Promise<unknown> {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new ValidationError("Invalid alert id");
  const alert = await Alert.findById(id);
  if (!alert) throw new NotFoundError("Alert not found");
  alert.status = "resolved";
  alert.resolvedBy = "manual";
  alert.resolvedAt = new Date();
  await alert.save();
  logger.info("ALERT_RESOLVED", { alertId: id });
  return alert.toObject();
}
