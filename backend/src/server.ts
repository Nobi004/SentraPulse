import "dotenv/config";
import { createApp } from "./app.js";
import { connectDB, disconnectDB } from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { startSimulator, stopSimulator } from "./scheduler/simulator.js";

const app = createApp();

await connectDB(env.MONGODB_URI);

const server = app.listen(env.PORT, () => {
  logger.info("SERVER_STARTED", { port: env.PORT });
});

startSimulator();

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    stopSimulator();
    void (async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await disconnectDB();
      process.exit(0);
    })();
  });
}
