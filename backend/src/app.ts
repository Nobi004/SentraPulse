import express from "express";
import helmet from "helmet";
import cors from "cors";
import { requestId } from "./middleware/request-id.js";
import { notFound } from "./middleware/not-found.js";
import { errorHandler } from "./middleware/error-handler.js";

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

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
