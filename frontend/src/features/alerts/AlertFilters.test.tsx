import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AlertFilters } from "./AlertFilters.js";

describe("AlertFilters", () => {
  it("emits updated filters (severity/status/apiName), status defaults active", () => {
    const onChange = vi.fn();
    render(
      <AlertFilters
        filters={{ severity: "", apiName: "", status: "active" }}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Severity"), {
      target: { value: "critical" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      severity: "critical",
      apiName: "",
      status: "active",
    });

    fireEvent.change(screen.getByLabelText("API name"), {
      target: { value: "Billing" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      severity: "",
      apiName: "Billing",
      status: "active",
    });

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "resolved" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      severity: "",
      apiName: "",
      status: "resolved",
    });
  });
});
