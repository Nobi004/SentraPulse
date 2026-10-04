import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod: MongoMemoryServer | undefined;

export async function startTestDB(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

export async function stopTestDB(): Promise<void> {
  await mongoose.disconnect();
  await mongod?.stop();
  mongod = undefined;
}

export async function clearDB(): Promise<void> {
  const collections = Object.values(mongoose.connection.collections);
  for (const c of collections) {
    await c.deleteMany({});
  }
}
