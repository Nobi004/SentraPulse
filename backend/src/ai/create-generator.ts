import { env } from "../config/env.js";
import type { AlertGenerator } from "../domain/alert/alert-generator.js";
import {
  createGeminiGenerator,
  GEMINI_MODEL,
} from "./gemini-alert-generator.js";

export function createAlertGenerator(): AlertGenerator | null {
  if (env.LLM_PROVIDER === "none") return null;
  if (env.LLM_PROVIDER === "gemini") {
    if (!env.GEMINI_API_KEY) return null;
    return createGeminiGenerator(
      env.GEMINI_API_KEY,
      GEMINI_MODEL,
      env.LLM_TIMEOUT_MS,
    );
  }
  return null;
}
