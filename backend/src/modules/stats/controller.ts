import type { NextFunction, Request, Response } from "express";
import { getStats } from "./service.js";

export async function getStatsHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await getStats();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
