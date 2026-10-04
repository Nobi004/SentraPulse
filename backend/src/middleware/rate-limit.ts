import rateLimit from "express-rate-limit";

// Protects POST /monitor: that endpoint can trigger paid LLM calls.
// Factory form keeps the default (300/15min) in one place while letting
// tests prove 429 behavior fast with a small max on a throwaway app.
export function createMonitorLimiter(max = 300) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many requests" },
    },
  });
}
