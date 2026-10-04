import express from "express";
import helmet from "helmet";
import cors from "cors";
import mongoose from "mongoose";
import { requestId } from "./middleware/request-id.js";
import { notFound } from "./middleware/not-found.js";
import { errorHandler } from "./middleware/error-handler.js";
import { monitorRouter } from "./modules/monitoring/routes.js";
import { alertsRouter } from "./modules/alerts/routes.js";
import { statsRouter } from "./modules/stats/routes.js";
import { createMonitorLimiter } from "./middleware/rate-limit.js";
import { apiKey } from "./middleware/api-key.js";

export interface HealthBody {
  success: boolean;
  data: { uptime: number; db: "connected" | "disconnected" };
}

// Mongoose readyState 1 = connected. Anything else (connecting,
// disconnected, never configured) is not ready: orchestrators must
// see 503, not a cheerful 200.
export function buildHealthBody(readyState: number): {
  status: number;
  body: HealthBody;
} {
  const connected = readyState === 1;
  return {
    status: connected ? 200 : 503,
    body: {
      success: connected,
      data: {
        uptime: process.uptime(),
        db: connected ? "connected" : "disconnected",
      },
    },
  };
}

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
  app.use(express.json({ limit: "256kb" }));
  app.use(requestId);

  app.get("/api/v1/health", (_req, res) => {
    const { status, body } = buildHealthBody(mongoose.connection.readyState);
    res.status(status).json(body);
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
