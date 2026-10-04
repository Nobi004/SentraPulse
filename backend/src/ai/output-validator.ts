import type { AlertGenerationInput } from "../domain/alert/alert-generator.js";

export function validateOutput(
  text: string,
  input: AlertGenerationInput,
): boolean {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 400) return false;
  if (!trimmed.includes(input.apiName)) return false;
  if (
    input.metrics?.statusCode != null &&
    !trimmed.includes(String(input.metrics.statusCode))
  ) {
    return false;
  }
  return true;
}
