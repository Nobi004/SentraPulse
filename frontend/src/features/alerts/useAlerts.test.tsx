import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAlerts } from "./useAlerts.js";

function okJson(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useAlerts polling", () => {
  it("loads once then refetches every 10s; stops on unmount", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => okJson({ success: true, data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderHook(() =>
      useAlerts({ severity: "", apiName: "", status: "active" }),
    );

    await act(async () => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const calls = fetchMock.mock.calls.length;
    unmount();
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });
    expect(fetchMock.mock.calls.length).toBe(calls);
  });
});
