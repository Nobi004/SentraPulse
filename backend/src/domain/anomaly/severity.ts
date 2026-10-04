import type { Severity } from "./types.js";

export function getSeverity(score: number): Severity {
  if (score <= 0) return "none";
  if (score <= 2) return "low";
  if (score <= 4) return "medium";
  if (score <= 7) return "high";
  return "critical";
}
