# ADR-0004: Incident Signature Deduplication

Status: Accepted

## Context

Noisy APIs re-emit the same failure many times. One alert per observation
would spam operators and trigger one paid LLM call per repeat.

## Decision

The unit of alerting is the incident, keyed by `apiName` plus sorted anomaly
types. At most one active incident exists per signature, enforced by a
partial unique index. Repeats bump `occurrenceCount` and refresh `lastSeenAt`
without new incidents or LLM calls; a changed signature or healthy
observation resolves the stale incident automatically.

## Consequences

- Alert volume stays proportional to distinct problems, not raw telemetry.
- Severity reflects the incident's first observation and does not escalate
  while it continues.
- Concurrent duplicates are safe: the unique index plus an idempotent retry
  keeps exactly one active row.
