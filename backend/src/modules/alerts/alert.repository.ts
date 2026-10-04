import { Alert } from "./alert.model.js";

export interface NewAlertDoc {
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
  message: string;
  firstObservationId: string;
  lastObservationId: string;
}

// Update-first-then-insert: avoids rawResult juggling and makes
// created-vs-updated explicit. Duplicate-key (11000) from a lost race
// falls back to a single bump retry.
export async function upsertAlert(
  doc: NewAlertDoc,
): Promise<{ alertId: string; created: boolean }> {
  const now = new Date();

  const matched = await Alert.findOneAndUpdate(
    { apiName: doc.apiName, signature: doc.signature, status: "active" },
    {
      $inc: { occurrenceCount: 1 },
      $set: { lastSeenAt: now, lastObservationId: doc.lastObservationId },
    },
    { new: true },
  );
  if (matched) return { alertId: String(matched._id), created: false };

  try {
    const created = await Alert.create({
      ...doc,
      messageSource: "fallback",
      status: "active",
      occurrenceCount: 1,
      detectedAt: now,
      lastSeenAt: now,
    });
    return { alertId: String(created._id), created: true };
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === 11000
    ) {
      const found = await Alert.findOneAndUpdate(
        { apiName: doc.apiName, signature: doc.signature, status: "active" },
        {
          $inc: { occurrenceCount: 1 },
          $set: { lastSeenAt: now, lastObservationId: doc.lastObservationId },
        },
        { new: true },
      );
      if (found) return { alertId: String(found._id), created: false };
    }
    throw err;
  }
}
