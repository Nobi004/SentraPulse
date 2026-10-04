import mongoose from "mongoose";
import { env } from "../../config/env.js";

const observationSchema = new mongoose.Schema(
  {
    apiName: { type: String, required: true },
    responseTimeMs: { type: Number, default: null },
    statusCode: { type: Number, default: null },
    recordsReturned: { type: Number, default: null },
    anomalyTypes: { type: [String], default: [] },
    riskScore: { type: Number, default: 0 },
    observedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

observationSchema.index({ apiName: 1, observedAt: -1 });
observationSchema.index(
  { observedAt: 1 },
  { expireAfterSeconds: env.OBSERVATION_TTL_DAYS * 86400 },
);

export const Observation = mongoose.model("Observation", observationSchema);
