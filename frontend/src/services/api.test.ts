import { afterEach, describe, expect, it, vi } from "vitest";
import { getStats, listAlerts, resolveAlert } from "./api.js";

function okJson(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api service", () => {
  it("listAlerts encodes query and returns data", async () => {
    const fetchMock = vi.fn(async (..._args: unknown[]) =>
      okJson({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await listAlerts({ status: "active", severity: "critical" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("/api/v1/alerts?");
    expect(url).toContain("status=active");
    expect(url).toContain("severity=critical");
    expect(res.data).toEqual([]);
  });

  it("throws envelope message on !ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        statusText: "Bad",
        json: async () => ({ error: { message: "Invalid alerts query" } }),
      })),
    );
    await expect(listAlerts({ status: "active" })).rejects.toThrow(
      "Invalid alerts query",
    );
  });

  it("getStats hits /api/v1/stats", async () => {
    const fetchMock = vi.fn(async (..._args: unknown[]) =>
      okJson({
        success: true,
        data: {
          totalObservations: 2,
          activeAlerts: 1,
          criticalAlerts: 1,
          avgResponseTimeMs: 2800,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await getStats();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/v1/stats");
    expect(res.data.activeAlerts).toBe(1);
  });

  it("resolveAlert PATCHes the alert URL", async () => {
    const fetchMock = vi.fn(async () => okJson({ success: true }));
    vi.stubGlobal("fetch", fetchMock);
    await resolveAlert("abc123");
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/alerts/abc123/resolve", {
      method: "PATCH",
    });
  });
});
