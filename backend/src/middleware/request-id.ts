import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

export function requestId(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const id = `req_${randomUUID().slice(0, 8)}`;
  (req as unknown as Record<string, string>).requestId = id;
  res.setHeader("x-request-id", id);
  next();
}
