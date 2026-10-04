import type { NextFunction, Request, Response } from "express";
import { processBatch } from "./service.js";

export async function postMonitor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { summary, results } = await processBatch(req.body);
    res.json({ success: true, summary, results });
  } catch (err) {
    next(err);
  }
}
