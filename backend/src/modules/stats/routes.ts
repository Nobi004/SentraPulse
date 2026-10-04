import { Router } from "express";
import { getStatsHandler } from "./controller.js";

export const statsRouter = Router();

statsRouter.get("/", getStatsHandler);
