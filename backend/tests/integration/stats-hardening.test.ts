import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../../src/app.js";
import { startTestDB, stopTestDB, clearDB } from "../helpers/db.js";
import { createMonitorLimiter } from "../../src/middleware/rate-limit.js";

const app = createApp();

beforeAll(startTestDB);
afterAll(stopTestDB);
beforeEach(clearDB);

describe("stats + hardening", () => {
  it("GET /stats returns four numbers, avg ignores null", async () => {
    await request(app)
      .post("/api/v1/monitor")
      .send({
        api_name: "S",
        response_time_ms: 100,
        status_code: 200,
        records_returned: 1,
      })
      .expect(200);
    await request(app)
      .post("/api/v1/monitor")
      .send({
        api_name: "S",
        response_time_ms: 5500,
        status_code: 500,
        records_returned: 0,
      })
      .expect(200);
    // null-latency observation below: invalid numerics stored as null + MALFORMED

    const r = await request(app).get("/api/v1/stats").expect(200);
    expect(r.body.success).toBe(true);
    expect(r.body.data.totalObservations).toBe(2);
    expect(r.body.data.activeAlerts).toBe(1);
    expect(r.body.data.criticalAlerts).toBe(1);
    expect(r.body.data.avgResponseTimeMs).toBeCloseTo((100 + 5500) / 2);

    // null-latency observation still counts in total but not in avg
    await request(app)
      .post("/api/v1/monitor")
      .send({
        api_name: "S",
        response_time_ms: "fast",
        status_code: 200,
        records_returned: 1,
      })
      .expect(200);
    const r2 = await request(app).get("/api/v1/stats").expect(200);
    expect(r2.body.data.totalObservations).toBe(3);
    expect(r2.body.data.avgResponseTimeMs).toBeCloseTo((100 + 5500) / 2);
  });

  it("GET /stats alias works", async () => {
    await request(app).get("/stats").expect(200);
  });

  it("400 on batch larger than MAX_BATCH_SIZE", async () => {
    const big = Array.from({ length: 101 }, () => ({
      api_name: "B",
      response_time_ms: 10,
      status_code: 200,
      records_returned: 1,
    }));
    await request(app).post("/api/v1/monitor").send(big).expect(400);
  });

  it("rate limiter returns 429 envelope after burst (factory, max 2)", async () => {
    const mini = express();
    mini.use(express.json());
    mini.use(createMonitorLimiter(2));
    mini.post("/t", (_req, res) => res.json({ success: true }));
    await request(mini).post("/t").send({}).expect(200);
    await request(mini).post("/t").send({}).expect(200);
    const r = await request(mini).post("/t").send({}).expect(429);
    expect(r.body).toMatchObject({
      success: false,
      error: { code: "RATE_LIMITED" },
    });
  });

  it("api-key: closed when set (401 without, 200 with), open when empty", async () => {
    vi.resetModules();
    vi.stubEnv("INGEST_API_KEY", "secret-123");
    const closed = await import("../../src/middleware/api-key.js");
    const closedApp = express();
    closedApp.use(express.json());
    closedApp.use(closed.apiKey);
    closedApp.post("/t", (_req, res) => res.json({ success: true }));
    await request(closedApp).post("/t").send({}).expect(401);
    await request(closedApp)
      .post("/t")
      .set("x-api-key", "wrong")
      .send({})
      .expect(401);
    await request(closedApp)
      .post("/t")
      .set("x-api-key", "secret-123")
      .send({})
      .expect(200);
    vi.unstubAllEnvs();

    vi.resetModules();
    vi.stubEnv("INGEST_API_KEY", "");
    const open = await import("../../src/middleware/api-key.js");
    const openApp = express();
    openApp.use(express.json());
    openApp.use(open.apiKey);
    openApp.post("/t", (_req, res) => res.json({ success: true }));
    await request(openApp).post("/t").send({}).expect(200);
    vi.unstubAllEnvs();
  });
});
