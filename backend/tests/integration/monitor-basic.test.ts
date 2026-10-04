import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { startTestDB, stopTestDB, clearDB } from "../helpers/db.js";

const app = createApp();

beforeAll(startTestDB);
afterAll(stopTestDB);
beforeEach(clearDB);

describe("POST /api/v1/monitor basics", () => {
  it("POST single healthy observation", async () => {
    const ok = await request(app)
      .post("/api/v1/monitor")
      .send({
        api_name: "PatientDataAPI",
        response_time_ms: 120,
        status_code: 200,
        records_returned: 5,
      })
      .expect(200);
    expect(ok.body.success).toBe(true);
    expect(ok.body.summary).toMatchObject({
      processed: 1,
      healthy: 1,
      anomalies: 0,
      rejected: 0,
    });
    expect(ok.body.results[0]).toMatchObject({
      apiName: "PatientDataAPI",
      status: "healthy",
    });
  });

  it("POST single anomaly (no alert fields yet in 3a)", async () => {
    const r = await request(app)
      .post("/api/v1/monitor")
      .send({
        api_name: "AppointmentAPI",
        response_time_ms: 5500,
        status_code: 500,
        records_returned: 0,
      })
      .expect(200);
    expect(r.body.summary).toMatchObject({ processed: 1, anomalies: 1 });
    expect(r.body.results[0]).toMatchObject({
      apiName: "AppointmentAPI",
      status: "anomaly",
      severity: "critical",
    });
    expect(r.body.results[0]).not.toHaveProperty("alertId");
  });

  it("batch continues past per-item reject", async () => {
    const batch = await request(app)
      .post("/api/v1/monitor")
      .send([
        {
          api_name: "A",
          response_time_ms: 100,
          status_code: 200,
          records_returned: 1,
        },
        {
          api_name: "",
          response_time_ms: 100,
          status_code: 200,
          records_returned: 1,
        },
      ])
      .expect(200);
    expect(batch.body.summary).toMatchObject({ processed: 1, rejected: 1 });
    expect(batch.body.results[1]).toMatchObject({
      index: 1,
      status: "rejected",
    });
  });

  it("400 on empty array and non-object body", async () => {
    await request(app).post("/api/v1/monitor").send([]).expect(400);
    await request(app)
      .post("/api/v1/monitor")
      .set("Content-Type", "application/json")
      .send("42")
      .expect(400);
  });

  it("alias POST /monitor works", async () => {
    await request(app)
      .post("/monitor")
      .send({
        api_name: "Z",
        response_time_ms: 10,
        status_code: 200,
        records_returned: 1,
      })
      .expect(200);
  });
});
