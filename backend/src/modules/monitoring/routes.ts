import { Router } from "express";
import { postMonitor } from "./controller.js";

export const monitorRouter = Router();

monitorRouter.post("/", postMonitor);
