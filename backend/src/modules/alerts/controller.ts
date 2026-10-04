import type { NextFunction, Request, Response } from "express";
import { listAlerts, resolveAlert } from "./service.js";

export async function getAlerts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { data, pagination } = await listAlerts(req.query);
    res.json({ success: true, data, pagination });
  } catch (err) {
    next(err);
  }
}

export async function patchResolveAlert(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await resolveAlert(req.params.id as string);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
