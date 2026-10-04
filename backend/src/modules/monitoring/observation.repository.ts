import { Observation } from "./observation.model.js";

export interface ObservationDoc {
  apiName: string;
  responseTimeMs: number | null;
  statusCode: number | null;
  recordsReturned: number | null;
  anomalyTypes: string[];
  riskScore: number;
  observedAt: Date;
}

export async function insertObservations(
  docs: ObservationDoc[],
): Promise<{ _id: unknown }[]> {
  if (docs.length === 0) return [];
  const inserted = await Observation.insertMany(docs, { ordered: false });
  return inserted.map((d) => ({ _id: d._id }));
}

export interface BaselineContext {
  sampleSize: number;
  medianResponseTimeMs: number | null;
  anomalyCount: number;
}

// Recent baseline for one API: newest-first, limit 20. Used only as
// LLM context — never for detection.
export async function getBaseline(
  apiName: string,
  limit = 20,
): Promise<BaselineContext> {
  const docs = (await Observation.find({ apiName })
    .sort({ observedAt: -1, _id: -1 })
    .limit(limit)
    .lean()) as { responseTimeMs: number | null; anomalyTypes: string[] }[];
  const latencies = docs
    .map((d) => d.responseTimeMs)
    .filter((v): v is number => typeof v === "number");
  latencies.sort((a, b) => a - b);
  const median =
    latencies.length > 0
      ? (latencies[Math.floor(latencies.length / 2)] as number)
      : null;
  return {
    sampleSize: docs.length,
    medianResponseTimeMs: median,
    anomalyCount: docs.filter((d) => (d.anomalyTypes?.length ?? 0) > 0).length,
  };
}
