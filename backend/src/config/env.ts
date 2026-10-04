import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().default("mongodb://localhost:27017/api-monitor"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  LOG_LEVEL: z.string().default("info"),
  HIGH_RESPONSE_TIME_MS: z.coerce.number().default(5000),
  VERY_HIGH_RESPONSE_TIME_MS: z.coerce.number().default(10000),
  MAX_BATCH_SIZE: z.coerce.number().default(100),
  OBSERVATION_TTL_DAYS: z.coerce.number().default(30),
  LLM_PROVIDER: z.enum(["none", "gemini", "openai"]).default("none"),
  GEMINI_API_KEY: z.string().default(""),
  OPENAI_API_KEY: z.string().default(""),
  LLM_TIMEOUT_MS: z.coerce.number().default(5000),
  LLM_CONCURRENCY: z.coerce.number().default(5),
  LLM_MAX_PER_REQUEST: z.coerce.number().default(10),
  INGEST_API_KEY: z.string().default(""),
  SIMULATOR_ENABLED: z.string().default("false"),
  SIMULATOR_INTERVAL_MS: z.coerce.number().default(15000),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
