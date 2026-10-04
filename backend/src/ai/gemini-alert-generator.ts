import type { AlertGenerator } from "../domain/alert/alert-generator.js";
import { buildPrompt } from "./prompts.js";
import { validateOutput } from "./output-validator.js";

export const GEMINI_MODEL = "gemini-3.5-flash-lite";

export function createGeminiGenerator(
  apiKey: string,
  model: string = GEMINI_MODEL,
  timeoutMs = 5000,
): AlertGenerator {
  return {
    async generate(input) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          signal: AbortSignal.timeout(timeoutMs),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: buildPrompt(input) }] }],
            generationConfig: { maxOutputTokens: 150, temperature: 0.2 },
          }),
        },
      );
      if (!response.ok) {
        // Body excerpt only — the key travels in the query string, which is
        // never included, so this is safe to log.
        const detail = await response.text().catch(() => "");
        throw new Error(`GEMINI_${response.status}: ${detail.slice(0, 300)}`);
      }
      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      if (!validateOutput(text, input)) throw new Error("INVALID_OUTPUT");
      return text;
    },
  };
}
