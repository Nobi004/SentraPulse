import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

const app = createApp();

describe("health + errors", () => {
  it("GET /api/v1/health → 200 {success:true}", async () => {
    const r = await request(app).get("/api/v1/health").expect(200);
    expect(r.body.success).toBe(true);
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
