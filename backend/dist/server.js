import { createApp } from "./app.js";
import { connectDB, disconnectDB } from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
const app = createApp();
await connectDB(env.MONGODB_URI);
const server = app.listen(env.PORT, () => {
    logger.info("SERVER_STARTED", { port: env.PORT });
});
for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, async () => {
        server.close();
        await disconnectDB();
        process.exit(0);
    });
}
//# sourceMappingURL=server.js.map