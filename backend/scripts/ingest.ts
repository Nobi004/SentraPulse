import "dotenv/config";
import fs from "node:fs";
import mongoose from "mongoose";

// Static JSON ingest: npm run ingest -- data/sample-api-responses.json
async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: npm run ingest -- <file.json>");
    process.exit(1);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    throw new Error(`cannot read or parse ${file}`, { cause: err });
  }

  await mongoose.connect(
    process.env.MONGODB_URI ?? "mongodb://localhost:27017/api-monitor",
  );
  try {
    const { processBatch } =
      await import("../src/modules/monitoring/service.js");
    const { summary } = await processBatch(raw);
    console.log(JSON.stringify({ success: true, summary }));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  const cause =
    err instanceof Error && err.cause instanceof Error
      ? `: ${err.cause.message}`
      : "";
  console.error(`ingest error: ${message}${cause}`);
  process.exit(1);
});
