import { describe, expect, it } from "vitest";
import { detectAnomalies } from "../../src/domain/anomaly/anomaly-detector.js";

const cfg = { highResponseTimeMs: 5000, veryHighResponseTimeMs: 10000 };

describe("detectAnomalies", () => {
  it("healthy 200 fast with records is not anomaly", () => {
    const r = detectAnomalies(
      {
        apiName: "A",
        responseTimeMs: 120,
        statusCode: 200,
        recordsReturned: 5,
      },
      cfg,
    );
    expect(r).toMatchObject({
      isAnomaly: false,
      riskScore: 0,
      severity: "none",
      types: [],
    });
  });

  it("boundary 4999 healthy / 5000 HIGH / 10000 VERY_HIGH (+3 not +2)", () => {
    expect(
      detectAnomalies(
        {
          apiName: "A",
          responseTimeMs: 4999,
          statusCode: 200,
          recordsReturned: 1,
        },
        cfg,
      ).isAnomaly,
    ).toBe(false);
    const r = detectAnomalies(
      {
        apiName: "A",
        responseTimeMs: 5000,
        statusCode: 200,
        recordsReturned: 1,
      },
      cfg,
    );
    expect(r.types).toContain("HIGH_RESPONSE_TIME");
    expect(r.riskScore).toBe(2);
    expect(
      detectAnomalies(
        {
          apiName: "A",
          responseTimeMs: 10000,
          statusCode: 200,
          recordsReturned: 1,
        },
        cfg,
      ).riskScore,
    ).toBe(3);
  });

  it("4xx +2, 5xx +5, 3xx +1, zero +2, malformed +3", () => {
    expect(
      detectAnomalies(
        {
          apiName: "A",
          responseTimeMs: 10,
          statusCode: 404,
          recordsReturned: 1,
        },
        cfg,
      ).riskScore,
    ).toBe(2);
    expect(
      detectAnomalies(
        {
          apiName: "A",
          responseTimeMs: 10,
          statusCode: 500,
          recordsReturned: 1,
        },
        cfg,
      ).severity,
    ).toBe("high");
    expect(
      detectAnomalies(
        {
          apiName: "A",
          responseTimeMs: 10,
          statusCode: 301,
          recordsReturned: 1,
        },
        cfg,
      ).types,
    ).toContain("UNEXPECTED_STATUS");
    expect(
      detectAnomalies(
        {
          apiName: "A",
          responseTimeMs: 10,
          statusCode: 200,
          recordsReturned: 0,
        },
        cfg,
      ).types,
    ).toContain("ZERO_RECORDS");
    expect(
      detectAnomalies(
        {
          apiName: "A",
          responseTimeMs: null,
          statusCode: 200,
          recordsReturned: 1,
        },
        cfg,
      ).types,
    ).toContain("MALFORMED_RESPONSE");
    expect(
      detectAnomalies(
        {
          apiName: "A",
          responseTimeMs: -5,
          statusCode: 200,
          recordsReturned: 1,
        },
        cfg,
      ).reasons.join(" "),
    ).toMatch(/response_time/i);
    expect(
      detectAnomalies(
        {
          apiName: "A",
          responseTimeMs: 10,
          statusCode: 99,
          recordsReturned: 1,
        },
        cfg,
      ).types,
    ).toContain("MALFORMED_RESPONSE");
  });

  it("reference example 5500+500+0 → 9 critical", () => {
    const r = detectAnomalies(
      {
        apiName: "AppointmentAPI",
        responseTimeMs: 5500,
        statusCode: 500,
        recordsReturned: 0,
      },
      cfg,
    );
    expect(r.riskScore).toBe(9);
    expect(r.severity).toBe("critical");
  });

  it("uses env defaults when cfg omitted", () => {
    const r = detectAnomalies({
      apiName: "AppointmentAPI",
      responseTimeMs: 5500,
      statusCode: 500,
      recordsReturned: 0,
    });
    expect(r.riskScore).toBe(9);
  });

  it("honours injected thresholds", () => {
    const custom = { highResponseTimeMs: 1000, veryHighResponseTimeMs: 2000 };
    expect(
      detectAnomalies(
        {
          apiName: "A",
          responseTimeMs: 1500,
          statusCode: 200,
          recordsReturned: 1,
        },
        custom,
      ).types,
    ).toContain("HIGH_RESPONSE_TIME");
    expect(
      detectAnomalies(
        {
          apiName: "A",
          responseTimeMs: 1500,
          statusCode: 200,
          recordsReturned: 1,
        },
        cfg,
      ).isAnomaly,
    ).toBe(false);
  });
});
