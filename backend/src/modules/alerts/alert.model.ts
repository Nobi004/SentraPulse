import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    apiName: { type: String, required: true },
    signature: { type: String, required: true },
    anomalyTypes: { type: [String], default: [] },
    reasons: { type: [String], default: [] },
    severity: { type: String, required: true },
    riskScore: { type: Number, default: 0 },
    metrics: {
      responseTimeMs: { type: Number, default: null },
      statusCode: { type: Number, default: null },
      recordsReturned: { type: Number, default: null },
    },
    message: { type: String, required: true },
    messageSource: {
      type: String,
      enum: ["ai", "fallback"],
      default: "fallback",
    },
    model: { type: String },
    promptVersion: { type: String },
    status: { type: String, enum: ["active", "resolved"], default: "active" },
    resolvedBy: { type: String, enum: ["manual", "auto"] },
    firstObservationId: { type: String },
    lastObservationId: { type: String },
    occurrenceCount: { type: Number, default: 1 },
    detectedAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
  },
  { versionKey: false },
);

alertSchema.index(
  { apiName: 1, signature: 1 },
  { unique: true, partialFilterExpression: { status: "active" } },
);
alertSchema.index({ status: 1, detectedAt: -1 });
alertSchema.index({ severity: 1, detectedAt: -1 });

export const Alert = mongoose.model("Alert", alertSchema);
