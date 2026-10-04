import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AlertTable } from "./AlertTable.js";
import type { AlertDto } from "../../types/api.js";

const sample: AlertDto[] = [
  {
    _id: "a1",
    apiName: "AppointmentAPI",
    severity: "critical",
    status: "active",
    anomalyTypes: ["HTTP_SERVER_ERROR"],
    message: "CRITICAL: AppointmentAPI — HTTP 500.",
    messageSource: "ai",
    occurrenceCount: 3,
    lastSeenAt: new Date("2026-10-04T10:00:00Z").toISOString(),
    metrics: { responseTimeMs: 5500, statusCode: 500, recordsReturned: 0 },
  },
  {
    _id: "r1",
    apiName: "PatientDataAPI",
    severity: "low",
    status: "resolved",
    anomalyTypes: ["HIGH_RESPONSE_TIME"],
    message: "LOW: PatientDataAPI — slow.",
    messageSource: "fallback",
    occurrenceCount: 1,
    lastSeenAt: new Date("2026-10-03T10:00:00Z").toISOString(),
    metrics: { responseTimeMs: null, statusCode: null, recordsReturned: null },
  },
];

describe("AlertTable", () => {
  it("renders rows with badges, nulls as dashes, resolve only for active", () => {
    const onResolve = vi.fn();
    render(
      <AlertTable alerts={sample} resolvingId={null} onResolve={onResolve} />,
    );

    expect(screen.getByText("AppointmentAPI")).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
    expect(screen.getByText("Template")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    // null metrics render as dashes (3 null cells in the resolved row)
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);

    const buttons = screen.getAllByRole("button", { name: "Resolve" });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0] as HTMLElement);
    expect(onResolve).toHaveBeenCalledWith("a1");
  });

  it("disables the resolving row", () => {
    render(<AlertTable alerts={sample} resolvingId="a1" onResolve={vi.fn()} />);
    expect(screen.getByRole("button", { name: "…" })).toBeDisabled();
  });
});
