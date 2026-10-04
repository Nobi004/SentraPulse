import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { startTestDB, stopTestDB, clearDB } from "../helpers/db.js";

const app = createApp();

beforeAll(startTestDB);
afterAll(stopTestDB);
beforeEach(clearDB);

describe("auto-resolve", () => {
  it("healthy resolves own API only, other API untouched", async () => {
    await request(app)
      .post("/api/v1/monitor")
      .send({
        api_name: "A",
        response_time_ms: 5500,
        status_code: 500,
        records_returned: 0,
      })
      .expect(200);
    await request(app)
      .post("/api/v1/monitor")
      .send({
        api_name: "B",
        response_time_ms: 5500,
        status_code: 500,
        records_returned: 0,
      })
      .expect(200);
    await request(app)
      .post("/api/v1/monitor")
      .send({
        api_name: "A",
        response_time_ms: 80,
        status_code: 200,
        records_returned: 3,
      })
      .expect(200);

    const a = await request(app)
      .get("/api/v1/alerts?status=active&apiName=A")
      .expect(200);
    expect(a.body.data).toHaveLength(0);
    const b = await request(app)
      .get("/api/v1/alerts?status=active&apiName=B")
      .expect(200);
    expect(b.body.data).toHaveLength(1);
    const resolvedA = await request(app)
      .get("/api/v1/alerts?status=resolved&apiName=A")
      .expect(200);
    expect(resolvedA.body.data[0]).toMatchObject({ resolvedBy: "auto" });
  });

  it("different signature resolves old incident and opens new", async () => {
    await request(app)
      .post("/api/v1/monitor")
      .send({
        api_name: "C",
        response_time_ms: 100,
        status_code: 500,
        records_returned: 1,
      })
      .expect(200);
    await request(app)
      .post("/api/v1/monitor")
      .send({
        api_name: "C",
        response_time_ms: 100,
        status_code: 404,
        records_returned: 1,
      })
      .expect(200);

    const active = await request(app)
      .get("/api/v1/alerts?status=active&apiName=C")
      .expect(200);
    expect(active.body.data).toHaveLength(1);
    expect(active.body.data[0].anomalyTypes).toContain("HTTP_CLIENT_ERROR");
    const resolved = await request(app)
      .get("/api/v1/alerts?status=resolved&apiName=C")
      .expect(200);
    expect(resolved.body.data).toHaveLength(1);
    expect(resolved.body.data[0]).toMatchObject({ resolvedBy: "auto" });
  });

  it("same signature twice in one batch still dedupes to count 2", async () => {
    const bad = {
      api_name: "D",
      response_time_ms: 5500,
      status_code: 500,
      records_returned: 0,
    };
    const r = await request(app)
      .post("/api/v1/monitor")
      .send([bad, bad])
      .expect(200);
    expect(r.body.results[0]).toMatchObject({ alertAction: "created" });
    expect(r.body.results[1]).toMatchObject({ alertAction: "updated" });
    const active = await request(app)
      .get("/api/v1/alerts?status=active&apiName=D")
      .expect(200);
    expect(active.body.data).toHaveLength(1);
    expect(active.body.data[0]).toMatchObject({ occurrenceCount: 2 });
  });

  it("rejected items trigger no resolve", async () => {
    await request(app)
      .post("/api/v1/monitor")
      .send({
        api_name: "E",
        response_time_ms: 5500,
        status_code: 500,
        records_returned: 0,
      })
      .expect(200);
    const r = await request(app)
      .post("/api/v1/monitor")
      .send([
        {
          api_name: "",
          response_time_ms: 1,
          status_code: 200,
          records_returned: 1,
        },
      ])
      .expect(200);
    expect(r.body.summary).toMatchObject({ rejected: 1 });
    const active = await request(app)
      .get("/api/v1/alerts?status=active&apiName=E")
      .expect(200);
    expect(active.body.data).toHaveLength(1);
  });
});
