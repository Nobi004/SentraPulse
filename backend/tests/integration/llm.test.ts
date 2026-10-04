import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { startTestDB, stopTestDB, clearDB } from "../helpers/db.js";
import { processBatch } from "../../src/modules/monitoring/service.js";
import { GEMINI_MODEL } from "../../src/ai/gemini-alert-generator.js";
import { Alert } from "../../src/modules/alerts/alert.model.js";
import type {
  AlertGenerationInput,
  AlertGenerator,
} from "../../src/domain/alert/alert-generator.js";

beforeAll(startTestDB);
afterAll(stopTestDB);
beforeEach(clearDB);

const bad = (api: string) => ({
  api_name: api,
  response_time_ms: 5500,
  status_code: 500,
  records_returned: 0,
});

const goodText = (input: AlertGenerationInput): string =>
  `${input.apiName} hit HTTP ${input.metrics.statusCode}. May indicate overload. Check logs and service health.`;

const mockSuccess = (): AlertGenerator & {
  generate: ReturnType<typeof vi.fn>;
} => ({
  generate: vi.fn(async (input: AlertGenerationInput) => goodText(input)),
});

describe("LLM explanations (mocked generator)", () => {
  it("replaces fallback with ai text on success and stores model info", async () => {
    const gen = mockSuccess();
    const r = await processBatch(bad("AppointmentAPI"), { generator: gen });
    expect(r.results[0]).toMatchObject({
      status: "anomaly",
      alertAction: "created",
    });
    expect(gen.generate).toHaveBeenCalledTimes(1);

    const alert = await Alert.findOne({ apiName: "AppointmentAPI" }).lean();
    expect(alert).toMatchObject({
      messageSource: "ai",
      model: GEMINI_MODEL,
      promptVersion: "v1",
    });
    expect(alert?.message).toContain("AppointmentAPI");
  });

  it("keeps fallback when generator is null (provider none), still 200-style result", async () => {
    const r = await processBatch(bad("AppointmentAPI"), { generator: null });
    expect(r.results[0]).toMatchObject({
      status: "anomaly",
      alertAction: "created",
    });
    const alert = await Alert.findOne({ apiName: "AppointmentAPI" }).lean();
    expect(alert).toMatchObject({ messageSource: "fallback" });
    expect(alert?.message.length).toBeGreaterThan(0);
  });

  it("keeps fallback on provider error", async () => {
    const gen: AlertGenerator = {
      generate: async () => {
        throw new Error("GEMINI_500");
      },
    };
    await processBatch(bad("AppointmentAPI"), { generator: gen });
    const alert = await Alert.findOne({ apiName: "AppointmentAPI" }).lean();
    expect(alert).toMatchObject({ messageSource: "fallback" });
    expect(alert?.message.length).toBeGreaterThan(0);
  });

  it("keeps fallback on invalid output", async () => {
    const gen: AlertGenerator = {
      generate: async () => "garbage without a name",
    };
    await processBatch(bad("AppointmentAPI"), { generator: gen });
    const alert = await Alert.findOne({ apiName: "AppointmentAPI" }).lean();
    expect(alert).toMatchObject({ messageSource: "fallback" });
  });

  it("calls the LLM once for repeats (dedupe → updated, no second call)", async () => {
    const gen = mockSuccess();
    await processBatch(bad("AppointmentAPI"), { generator: gen });
    const r2 = await processBatch(bad("AppointmentAPI"), { generator: gen });
    expect(r2.results[0]).toMatchObject({ alertAction: "updated" });
    expect(gen.generate).toHaveBeenCalledTimes(1);
  });

  it("caps LLM calls at LLM_MAX_PER_REQUEST (11 new → 10 ai + 1 fallback)", async () => {
    const gen = mockSuccess();
    const batch = Array.from({ length: 11 }, (_, i) => bad(`CapApi${i}`));
    const r = await processBatch(batch, { generator: gen });
    expect(r.summary).toMatchObject({ processed: 11, anomalies: 11 });
    expect(gen.generate).toHaveBeenCalledTimes(10);
    expect(await Alert.countDocuments({ messageSource: "ai" })).toBe(10);
    expect(await Alert.countDocuments({ messageSource: "fallback" })).toBe(1);
  });

  it("factory returns null when provider is none", async () => {
    vi.resetModules();
    vi.stubEnv("LLM_PROVIDER", "none");
    vi.stubEnv("GEMINI_API_KEY", "");
    const mod = await import("../../src/ai/create-generator.js");
    expect(mod.createAlertGenerator()).toBeNull();
    vi.unstubAllEnvs();
  });

  it("factory warns and falls back for the unimplemented openai provider", async () => {
    vi.resetModules();
    vi.stubEnv("LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const { logger } = await import("../../src/config/logger.js");
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => logger);
    const mod = await import("../../src/ai/create-generator.js");
    expect(mod.createAlertGenerator()).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      "LLM_PROVIDER_NOT_IMPLEMENTED",
      expect.objectContaining({ provider: "openai" }),
    );
    warn.mockRestore();
    vi.unstubAllEnvs();
  });
});
