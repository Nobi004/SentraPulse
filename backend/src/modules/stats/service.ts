import { Observation } from "../monitoring/observation.model.js";
import { Alert } from "../alerts/alert.model.js";

export interface StatsResult {
  totalObservations: number;
  activeAlerts: number;
  criticalAlerts: number;
  avgResponseTimeMs: number | null;
}

export async function getStats(): Promise<StatsResult> {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const [totalObservations, activeAlerts, criticalAlerts, avgAgg] =
    await Promise.all([
      Observation.countDocuments({ observedAt: { $gte: since } }),
      Alert.countDocuments({ status: "active" }),
      Alert.countDocuments({ status: "active", severity: "critical" }),
      Observation.aggregate([
        {
          $match: {
            observedAt: { $gte: since },
            responseTimeMs: { $ne: null },
          },
        },
        { $group: { _id: null, avg: { $avg: "$responseTimeMs" } } },
      ]),
    ]);
  const avg = (avgAgg as { avg?: number }[])[0]?.avg ?? null;
  return {
    totalObservations,
    activeAlerts,
    criticalAlerts,
    avgResponseTimeMs: avg,
  };
}
