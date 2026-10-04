import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { startTestDB, stopTestDB, clearDB } from "../helpers/db.js";
import { detectAnomalies } from "../../src/domain/anomaly/anomaly-detector.js";
import {
  SIM_APIS,
  buildPayload,
  resetFaults,
  tickOnce,
} from "../../src/scheduler/simulator.js";
import { processBatch } from "../../src/modules/monitoring/service.js";
import { Observation } from "../../src/modules/monitoring/observation.model.js";
import { Alert } from "../../src/modules/alerts/alert.model.js";

beforeAll(startTestDB);
afterAll(stopTestDB);
beforeEach(async () => {
  await clearDB();
  resetFaults();
});

function toRaw(api: string, kind: Parameters<typeof buildPayload>[1]) {
  const p = buildPayload(api, kind);
  return {
    api_name: p.api_name,
    response_time_ms: p.response_time_ms,
    status_code: p.status_code,
    records_returned: p.records_returned,
  };
}

describe("simulator", () => {
  it("covers the four plan-default APIs", () => {
    expect(SIM_APIS).toEqual([
      "PatientDataAPI",
      "AppointmentAPI",
      "BillingAPI",
      "AuthAPI",
    ]);
  });

  it("fault payloads map to the expected anomaly types", () => {
    const cases = [
      ["slow", "HIGH_RESPONSE_TIME"],
      ["error500", "HTTP_SERVER_ERROR"],
      ["error404", "HTTP_CLIENT_ERROR"],
      ["zero", "ZERO_RECORDS"],
      ["malformed", "MALFORMED_RESPONSE"],
    ] as const;
    for (const [kind, expected] of cases) {
      const raw = toRaw("X", kind);
      const r = detectAnomalies({
        apiName: "X",
        responseTimeMs:
          typeof raw.response_time_ms === "number"
            ? raw.response_time_ms
            : null,
        statusCode:
          typeof raw.status_code === "number" ? raw.status_code : null,
        recordsReturned:
          typeof raw.records_returned === "number"
            ? raw.records_returned
            : null,
      });
      expect(r.types).toContain(expected);
    }
    const healthy = detectAnomalies({
      apiName: "X",
      responseTimeMs: toRaw("X", "healthy").response_time_ms as number,
      statusCode: 200,
      recordsReturned: 3,
    });
    expect(healthy.isAnomaly).toBe(false);
  });

  it("sticky faults persist then recover (injected → re-emit → healthy resolves)", async () => {
    // rand 0: every healthy API injects a 2-tick 'slow' fault and emits it
    await tickOnce(() => 0);
    expect(await Observation.countDocuments()).toBe(4);
    expect(await Alert.countDocuments({ status: "active" })).toBe(4);

    // rand ~1: no new injections, sticky faults re-emit (same signature → dedupe)
    await tickOnce(() => 0.99);
    await tickOnce(() => 0.99);
    expect(await Alert.countDocuments({ status: "active" })).toBe(4);
    const counts = await Alert.find({ status: "active" }).lean();
    for (const a of counts) expect(a.occurrenceCount).toBeGreaterThanOrEqual(2);

    // faults expired: healthy tick auto-resolves everything
    await tickOnce(() => 0.99);
    expect(await Alert.countDocuments({ status: "active" })).toBe(0);
  });

  it("ingest path: brief sample file processes end to end", async () => {
    const file = join(process.cwd(), "data", "sample-api-responses.json");
    const items = JSON.parse(readFileSync(file, "utf8"));
    const { summary } = await processBatch(items);
    expect(summary).toMatchObject({ processed: 2, healthy: 1, anomalies: 1 });
  });
});
