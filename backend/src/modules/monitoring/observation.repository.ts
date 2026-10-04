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
