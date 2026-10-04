import { expect, it } from "vitest";
import { buildFallbackMessage } from "../../src/domain/alert/fallback-message.js";

it("builds severity-prefixed message from reasons", () => {
  expect(
    buildFallbackMessage({
      apiName: "AppointmentAPI",
      severity: "critical",
      reasons: ["HTTP 500", "zero records returned"],
    }),
  ).toBe("CRITICAL: AppointmentAPI — HTTP 500; zero records returned.");
});
