import type { Request, Response, NextFunction } from "express";
import { NotFoundError } from "../errors/app-error.js";

export function notFound(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next(new NotFoundError());
}
