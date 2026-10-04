import "dotenv/config";
import fs from "node:fs";
import mongoose from "mongoose";

// Static JSON ingest: npm run ingest -- data/sample-api-responses.json
const file = process.argv[2];
if (!file) {
  console.error("usage: npm run ingest -- <file.json>");
  process.exit(1);
}

const raw: unknown = JSON.parse(fs.readFileSync(file, "utf8"));

await mongoose.connect(
  process.env.MONGODB_URI ?? "mongodb://localhost:27017/api-monitor",
);
const { processBatch } = await import("../src/modules/monitoring/service.js");
const { summary } = await processBatch(raw);
console.log(JSON.stringify({ success: true, summary }));
await mongoose.disconnect();
