import { describe, expect, it } from "vitest";
import { getSeverity } from "../../src/domain/anomaly/severity.js";

describe("getSeverity", () => {
  it.each([
    [0, "none"],
    [1, "low"],
    [2, "low"],
    [3, "medium"],
    [4, "medium"],
    [5, "high"],
    [7, "high"],
    [8, "critical"],
    [9, "critical"],
  ])("score %i → %s", (score, expected) => {
    expect(getSeverity(score)).toBe(expected);
  });
});
