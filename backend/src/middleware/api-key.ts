import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

// Optional shared-secret guard for POST /monitor. Unset key = open
// (zero-setup default); set key = header x-api-key required.
export function apiKey(req: Request, res: Response, next: NextFunction): void {
  if (!env.INGEST_API_KEY) {
    next();
    return;
  }
  if (req.headers["x-api-key"] === env.INGEST_API_KEY) {
    next();
    return;
  }
  const fallbackId = res.getHeader("x-request-id");
  const rid =
    (req as unknown as Record<string, string>).requestId ??
    (typeof fallbackId === "string" ? fallbackId : "req_unknown");
  res.status(401).json({
    success: false,
    error: { code: "UNAUTHORIZED", message: "Invalid API key", requestId: rid },
  });
}
