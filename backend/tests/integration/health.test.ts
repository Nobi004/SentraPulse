import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp, buildHealthBody } from "../../src/app.js";
import { startTestDB, stopTestDB } from "../helpers/db.js";

const app = createApp();

beforeAll(startTestDB);
afterAll(stopTestDB);

describe("health + errors", () => {
  it("GET /api/v1/health → 200 with connected db", async () => {
    const r = await request(app).get("/api/v1/health").expect(200);
    expect(r.body).toMatchObject({ success: true, data: { db: "connected" } });
    expect(r.body.data.uptime).toEqual(expect.any(Number));
  });

  it("buildHealthBody reports disconnected with 503 otherwise", () => {
    expect(buildHealthBody(0)).toMatchObject({
      status: 503,
      body: { success: false },
    });
    expect(buildHealthBody(0).body.data).toMatchObject({ db: "disconnected" });
    expect(buildHealthBody(2).status).toBe(503);
    expect(buildHealthBody(1)).toMatchObject({
      status: 200,
      body: { success: true },
    });
  });

  it("404 returns envelope with requestId, no stack", async () => {
    const r = await request(app).get("/nope").expect(404);
    expect(r.body).toMatchObject({
      success: false,
      error: { code: "NOT_FOUND", requestId: expect.any(String) },
    });
    expect(JSON.stringify(r.body)).not.toMatch(/stack|mongo:\/\//i);
  });
});
