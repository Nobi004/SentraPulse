# ADR-0002: Deterministic Anomaly Detection

Status: Accepted

## Context

Anomaly verdicts must be reproducible, explainable, and testable without any
model: operators need to know exactly why an observation was flagged, and
tests must assert exact boundaries (e.g. 4999 ms vs 5000 ms).

## Decision

Detection is a pure function (`detectAnomalies`) over fixed rules — latency
tiers, HTTP status classes, zero records, malformed fields — summed into a
risk score mapped to severity. `domain/` imports nothing from Express,
Mongoose, or any LLM SDK. Thresholds are environment-configurable but the
logic shape is fixed.

## Consequences

- Unit tests pin every boundary with no database or network.
- No learning or per-API adaptation out of the box; adaptive policies are
  roadmap items that plug in behind the same function signature.
- Severity is fixed at first detection and does not escalate mid-incident.
