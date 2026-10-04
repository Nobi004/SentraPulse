import { Router } from "express";
import { getAlerts, patchResolveAlert } from "./controller.js";

export const alertsRouter = Router();

alertsRouter.get("/", getAlerts);
alertsRouter.patch("/:id/resolve", patchResolveAlert);
