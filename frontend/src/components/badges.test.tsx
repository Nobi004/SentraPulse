import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeverityBadge } from "./SeverityBadge.js";
import { SourceBadge } from "./SourceBadge.js";

describe("badges", () => {
  it("SeverityBadge renders each severity", () => {
    const { rerender } = render(<SeverityBadge severity="critical" />);
    expect(screen.getByText("critical")).toBeInTheDocument();
    rerender(<SeverityBadge severity="low" />);
    expect(screen.getByText("low")).toBeInTheDocument();
  });

  it("SourceBadge shows AI vs Template", () => {
    const { rerender } = render(<SourceBadge source="ai" />);
    expect(screen.getByText("AI")).toBeInTheDocument();
    rerender(<SourceBadge source="fallback" />);
    expect(screen.getByText("Template")).toBeInTheDocument();
  });
});
