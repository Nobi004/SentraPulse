# ADR-0005: Template Fallback for AI Failure

Status: Accepted

## Context

Every new incident triggers a network call to a paid provider that can time
out, error, or return unusable text. Ingestion must never fail because of it,
and no alert may ever be stored without a message.

## Decision

Each alert is persisted with a deterministic template message first; the LLM
may replace it after passing output validation (non-empty, ≤400 chars,
names the API and status code). Calls are bounded per request (timeout,
concurrency limit, count cap) and every failure keeps the fallback with a
log line (`AI_PROVIDER_ERROR` / `FALLBACK_ALERT_USED`).

## Consequences

- `message` is never null; dashboards and APIs have no AI-dependent branch.
- Worst-case added ingest latency is bounded by timeout × (cap ÷ concurrency).
- With no provider configured, the system runs fallback-only indefinitely.
