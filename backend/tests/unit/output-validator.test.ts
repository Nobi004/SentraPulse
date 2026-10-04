import { describe, expect, it } from "vitest";
import { validateOutput } from "../../src/ai/output-validator.js";
import type { AlertGenerationInput } from "../../src/domain/alert/alert-generator.js";

const base: AlertGenerationInput = {
  apiName: "AppointmentAPI",
  severity: "critical",
  anomalyTypes: ["HTTP_SERVER_ERROR"],
  reasons: ["HTTP 500"],
  metrics: { responseTimeMs: 5500, statusCode: 500, recordsReturned: 0 },
};

describe("validateOutput", () => {
  it("accepts a good short alert", () => {
    expect(
      validateOutput(
        "AppointmentAPI hit HTTP 500, latency high. May indicate overload. Check logs and DB.",
        base,
      ),
    ).toBe(true);
  });

  it("rejects text missing the api name", () => {
    expect(
      validateOutput("oops no name 500, may indicate trouble. Check logs.", {
        ...base,
        apiName: "X",
      }),
    ).toBe(false);
  });

  it("rejects text missing the observed status code", () => {
    expect(
      validateOutput(
        "AppointmentAPI slow, may indicate trouble. Check logs.",
        base,
      ),
    ).toBe(false);
  });

  it("rejects empty and over-400-char text", () => {
    expect(validateOutput("", base)).toBe(false);
    expect(validateOutput("   ", base)).toBe(false);
    expect(validateOutput(`AppointmentAPI 500 ${"x".repeat(400)}`, base)).toBe(
      false,
    );
  });

  it("skips the code check when no status was observed", () => {
    const noCode = { ...base, metrics: { ...base.metrics, statusCode: null } };
    expect(
      validateOutput(
        "AppointmentAPI slow, may indicate trouble. Check logs.",
        noCode,
      ),
    ).toBe(true);
  });
});
