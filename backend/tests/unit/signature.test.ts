import { expect, it } from "vitest";
import { buildSignature } from "../../src/domain/alert/signature.js";

it("sorts types for stable signature", () => {
  expect(
    buildSignature("AppointmentAPI", ["ZERO_RECORDS", "HTTP_SERVER_ERROR"]),
  ).toBe("AppointmentAPI:HTTP_SERVER_ERROR|ZERO_RECORDS");
});

it("single type and empty list", () => {
  expect(buildSignature("A", ["HTTP_SERVER_ERROR"])).toBe(
    "A:HTTP_SERVER_ERROR",
  );
  expect(buildSignature("A", [])).toBe("A:");
});
