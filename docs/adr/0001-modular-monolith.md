# ADR-0001: Modular Monolith

Status: Accepted

## Context

SentraPulse needs one deployable system (backend, database, dashboard) with
clear boundaries between HTTP handling, business logic, and persistence, so
small teams can evolve each part without distributed-systems overhead.

## Decision

Ship a modular monolith: an Express app with `monitoring`, `alerts`, and
`stats` modules plus a shared pure `domain/`, backed by one MongoDB and one
React dashboard. Dependencies flow one way:
`routes → controllers → services → (domain | repositories | ai)`.

## Consequences

- Single build, single database, `docker compose up` deployment.
- Module boundaries are conventional, not physical; extracting a service
  later is possible but never required for scale-out of this workload.
- All modules share the process: a slow provider call affects request
  latency, mitigated by timeouts and concurrency caps (see ADR-0005).
