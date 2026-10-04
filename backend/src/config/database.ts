import mongoose from "mongoose";
import { logger } from "./logger.js";

export async function connectDB(uri: string): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  logger.info("DB_CONNECTED");
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
