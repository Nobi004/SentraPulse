import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { DashboardPage } from "./DashboardPage.js";
import type { AlertDto } from "../types/api.js";

const alert: AlertDto = {
  _id: "a1",
  apiName: "AppointmentAPI",
  severity: "critical",
  status: "active",
  anomalyTypes: ["HTTP_SERVER_ERROR"],
  message: "CRITICAL: AppointmentAPI — HTTP 500.",
  messageSource: "fallback",
  occurrenceCount: 1,
  lastSeenAt: new Date("2026-10-04T10:00:00Z").toISOString(),
  metrics: { responseTimeMs: 5500, statusCode: 500, recordsReturned: 0 },
};

function okJson(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

function stubFetch(resolveOk: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: unknown, init?: { method?: string }) => {
      const u = String(url);
      if (u.includes("/resolve")) {
        if (init?.method === "PATCH" && !resolveOk) {
          return {
            ok: false,
            statusText: "Bad",
            json: async () => ({ error: { message: "Alert not found" } }),
          } as Response;
        }
        return okJson({ success: true });
      }
      if (u.includes("/alerts")) {
        return okJson({
          success: true,
          data: [alert],
          pagination: { page: 1, limit: 20, total: 1, pages: 1 },
        });
      }
      return okJson({
        success: true,
        data: {
          totalObservations: 1,
          activeAlerts: 1,
          criticalAlerts: 1,
          avgResponseTimeMs: 5500,
        },
      });
    }),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DashboardPage resolve", () => {
  it("shows a visible error when resolve fails, dismissible", async () => {
    stubFetch(false);
    render(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("AppointmentAPI")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Resolve failed: Alert not found",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("no banner when resolve succeeds", async () => {
    stubFetch(true);
    render(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("AppointmentAPI")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
  });
});
