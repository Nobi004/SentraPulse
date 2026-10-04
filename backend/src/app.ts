import express from "express";
import helmet from "helmet";
import cors from "cors";
import { requestId } from "./middleware/request-id.js";
import { notFound } from "./middleware/not-found.js";
import { errorHandler } from "./middleware/error-handler.js";
import { monitorRouter } from "./modules/monitoring/routes.js";
import { alertsRouter } from "./modules/alerts/routes.js";
import { statsRouter } from "./modules/stats/routes.js";
import { createMonitorLimiter } from "./middleware/rate-limit.js";
import { apiKey } from "./middleware/api-key.js";

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
  app.use(express.json({ limit: "256kb" }));
  app.use(requestId);

  app.get("/api/v1/health", (_req, res) => {
    res.json({
      success: true,
      data: { uptime: process.uptime(), db: "not-checked" },
    });
  });

  const monitorLimiter = createMonitorLimiter();

  app.use("/api/v1/monitor", monitorLimiter, apiKey, monitorRouter);
  app.use("/monitor", monitorLimiter, apiKey, monitorRouter);
  app.use("/api/v1/alerts", alertsRouter);
  app.use("/alerts", alertsRouter);
  app.use("/api/v1/stats", statsRouter);
  app.use("/stats", statsRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
