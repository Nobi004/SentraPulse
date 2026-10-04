import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { startTestDB, stopTestDB, clearDB } from "../helpers/db.js";

const app = createApp();

beforeAll(startTestDB);
afterAll(stopTestDB);
beforeEach(clearDB);

const bad = {
  api_name: "AppointmentAPI",
  response_time_ms: 5500,
  status_code: 500,
  records_returned: 0,
};

describe("alerts dedupe + list + resolve", () => {
  it("same incident twice → one alert count 2, created then updated", async () => {
    const r1 = await request(app).post("/api/v1/monitor").send(bad).expect(200);
    expect(r1.body.results[0]).toMatchObject({
      status: "anomaly",
      alertAction: "created",
    });
    expect(r1.body.results[0].alertId).toEqual(expect.any(String));

    const r2 = await request(app).post("/api/v1/monitor").send(bad).expect(200);
    expect(r2.body.results[0]).toMatchObject({
      status: "anomaly",
      alertAction: "updated",
      alertId: r1.body.results[0].alertId,
    });

    const list = await request(app)
      .get("/api/v1/alerts?status=active")
      .expect(200);
    expect(list.body.success).toBe(true);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({
      occurrenceCount: 2,
      messageSource: "fallback",
      apiName: "AppointmentAPI",
    });
    expect(list.body.data[0].message).toEqual(expect.any(String));
  });

  it("GET defaults to active; pagination works", async () => {
    await request(app).post("/api/v1/monitor").send(bad).expect(200);
    const def = await request(app).get("/api/v1/alerts").expect(200);
    expect(def.body.success).toBe(true);
    expect(def.body.data).toHaveLength(1);

    const page = await request(app)
      .get("/api/v1/alerts?status=active&page=1&limit=1")
      .expect(200);
    expect(page.body.data).toHaveLength(1);
    expect(page.body.pagination).toMatchObject({ page: 1, limit: 1 });
  });

  it("PATCH resolve removes from active; 400 on bad id, 404 on missing", async () => {
    const r1 = await request(app).post("/api/v1/monitor").send(bad).expect(200);
    const id = r1.body.results[0].alertId as string;

    await request(app).patch("/api/v1/alerts/notanid/resolve").expect(400);
    await request(app)
      .patch("/api/v1/alerts/000000000000000000000000/resolve")
      .expect(404);

    await request(app).patch(`/api/v1/alerts/${id}/resolve`).expect(200);
    const active = await request(app)
      .get("/api/v1/alerts?status=active")
      .expect(200);
    expect(active.body.data).toHaveLength(0);
    const resolved = await request(app)
      .get("/api/v1/alerts?status=resolved")
      .expect(200);
    expect(resolved.body.data).toHaveLength(1);
    expect(resolved.body.data[0]).toMatchObject({ resolvedBy: "manual" });
  });

  it("alias GET /alerts works", async () => {
    await request(app).post("/api/v1/monitor").send(bad).expect(200);
    await request(app).get("/alerts").expect(200);
  });
});
