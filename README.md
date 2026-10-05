# SentraPulse

[![ci](https://github.com/Nobi004/SentraPulse/actions/workflows/ci.yml/badge.svg)](https://github.com/Nobi004/SentraPulse/actions/workflows/ci.yml)

SentraPulse monitors API telemetry, detects anomalies with deterministic
rules, groups repeats into incidents, and explains each new incident with a
short AI-written message — falling back to a deterministic template whenever
the AI is unavailable. One Express backend, one MongoDB, one React dashboard.

> **Detection is deterministic. The LLM only explains.**

## Why SentraPulse

- **API telemetry monitoring** — ingest response time, status codes, and
  record counts from live traffic, static JSON files, or the built-in simulator.
- **Deterministic anomaly detection** — high latency, failed requests, zero
  records, and malformed responses are scored by fixed rules, so results are
  reproducible and testable without any model.
- **Incident deduplication** — repeats of the same anomaly signature update
  one active incident (`occurrenceCount++`) instead of spamming alerts.
- **AI-assisted alert explanation** — each new incident gets a concise,
  human-readable message from Gemini, with recent baseline context.
- **Graceful AI fallback** — every alert is stored with a template message
  first; provider failure, timeouts, or invalid output never prevent alerting.

## Architecture

```text
API Telemetry
     │
     ▼
POST /monitor
     │
     ▼
Validation → Observation Store
     │
     ▼
Deterministic Anomaly Engine
     │
     ├── Healthy → Auto-resolve
     │
     └── Anomaly
            │
            ▼
      Incident/Deduplication
            │
            ▼
       Gemini ──failure──► Template Fallback
            │
            ▼
          Alerts
            │
            ▼
      React Dashboard
```

Modular monolith. Dependencies flow one way:

```text
routes → controllers → services → (domain | repositories | ai)
```

`domain/` is pure functions (no Express, Mongoose, or LLM SDK) and is unit-
tested in isolation. Full reference: [`docs/architecture.md`](docs/architecture.md);
key decisions: [`docs/adr/`](docs/adr/).

## Core Features

- Single and batch ingestion (`POST /monitor`, static JSON, simulator)
- Deterministic anomaly engine (latency tiers, 4xx/5xx, unexpected status,
  zero records, malformed responses)
- Severity scoring (`none` → `critical` from summed risk)
- Incident deduplication with occurrence tracking
- Automatic recovery: healthy observations resolve incidents
- LLM explanation for new incidents (Gemini, bounded and validated)
- Template fallback stored on every alert
- REST API with versioned paths plus compatibility aliases
- Operations dashboard (stats, filters, polling, resolve actions)
- 24-hour statistics endpoint
- Request IDs, structured JSON logging, sanitized errors
- Health endpoint with database readiness
- GitHub Actions CI and Docker Compose deployment

## Quick Start

```bash
docker compose up --build -d
```

- Dashboard: http://localhost:5173 (polls every 10s)
- API: http://localhost:4000/api/v1
- `LLM_PROVIDER=none` by default — the full system runs with no API key.
- The simulator (`SIMULATOR_ENABLED=true` in compose) generates traffic so
  incidents appear within seconds.

Local development (Node.js >= 20, MongoDB via Docker):

```bash
docker run -d --name sentrapulse-mongo -p 27017:27017 mongo:7
```

Backend:

```bash
cd backend
npm install
npx vitest run        # 57 tests
npm run dev           # :4000 (needs MONGODB_URI, defaults to localhost)
npm run ingest -- data/sample-api-responses.json
```

Frontend:

```bash
cd frontend
npm install
npm test              # 12 component tests
npm run dev           # :5173, proxies /api → :4000
```

## Secrets (`.env`, gitignored)

One line still runs everything. Secrets live in the root `.env`
(never committed); a missing file falls back to safe defaults.

```bash
# enable live Gemini-generated explanations
# obtain a Gemini API key from Google AI Studio
# edit .env: LLM_PROVIDER=gemini, GEMINI_API_KEY=<key>
docker compose up --build -d
```

```bash
# optional: lock down ingest with a shared secret
# edit .env: INGEST_API_KEY=<secret>  →  POST /monitor needs header x-api-key
```

## Configuration

All from environment (see [`.env.example`](.env.example)); every key has a
working default.

| Key | Default | Notes |
|---|---|---|
| `PORT` / `MONGODB_URI` / `CORS_ORIGIN` / `LOG_LEVEL` | `4000` / `mongodb://localhost:27017/api-monitor` / `http://localhost:5173` / `info` | — |
| `HIGH_RESPONSE_TIME_MS` / `VERY_HIGH_RESPONSE_TIME_MS` | `5000` / `10000` | Latency tiers (+2 / +3) |
| `MAX_BATCH_SIZE` | `100` | Bigger batches → 400 |
| `OBSERVATION_TTL_DAYS` | `30` | Observations expire via TTL |
| `LLM_PROVIDER` | `none` | `none` \| `gemini` (live) \| `openai` (warns, falls back — not implemented) |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | _(empty)_ | Missing key ⇒ fallback-only, never crashes |
| `LLM_TIMEOUT_MS` / `LLM_CONCURRENCY` / `LLM_MAX_PER_REQUEST` | `5000` / `5` / `10` | Cost/latency bounds |
| `INGEST_API_KEY` | _(empty)_ | If set, `POST /monitor` needs header `x-api-key` |
| `SIMULATOR_ENABLED` / `SIMULATOR_INTERVAL_MS` | `false` / `15000` | Compose sets `true` for the demo; bare servers stay quiet |

## REST API

Versioned APIs are exposed under `/api/v1`. Compatibility aliases
(`/monitor`, `/alerts`, and `/stats`) are also provided.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Liveness + readiness (200 `connected`, 503 while DB unreachable) |
| POST | `/api/v1/monitor` | Ingest one observation or a batch |
| GET | `/api/v1/alerts` | List alerts. **Defaults to `status=active`.** |
| PATCH | `/api/v1/alerts/:id/resolve` | Manual resolve |
| GET | `/api/v1/stats` | Four numbers, last 24h |

`GET /alerts` query: `status` (`active` default, `resolved`, `all`),
`severity`, `apiName`, `page` (1), `limit` (20, max 100).

Sample requests:

```bash
# single observation
curl -X POST localhost:4000/api/v1/monitor -H 'Content-Type: application/json' \
  -d '{"api_name":"AppointmentAPI","response_time_ms":5500,"status_code":500,"records_returned":0}'

# batch
curl -X POST localhost:4000/api/v1/monitor -H 'Content-Type: application/json' \
  -d '[{"api_name":"PatientDataAPI","response_time_ms":1200,"status_code":200,"records_returned":50},{"api_name":"AppointmentAPI","response_time_ms":5500,"status_code":500,"records_returned":0}]'

# active alerts + stats + resolve
curl 'localhost:4000/api/v1/alerts?status=active'
curl localhost:4000/api/v1/stats
curl -X PATCH localhost:4000/api/v1/alerts/<id>/resolve
```

`POST /monitor` returns:

`{ "success": true, "summary": {...}, "results": [...] }`

`GET` endpoints return `{ "success": true, "data": ... }` (alerts add a
`pagination` object). API errors use:

`{ "success": false, "error": { "code", "message", "requestId" } }`

## Anomaly Model

| Type | Condition | Score |
|---|---|---|
| `HIGH_RESPONSE_TIME` | `responseTimeMs >= 5000` (`>= 10000`: +3) | +2 / +3 |
| `HTTP_CLIENT_ERROR` | 400–499 | +2 |
| `HTTP_SERVER_ERROR` | 500–599 | +5 |
| `UNEXPECTED_STATUS` | 100–199 or 300–399 | +1 |
| `ZERO_RECORDS` | `recordsReturned === 0` | +2 |
| `MALFORMED_RESPONSE` | missing/invalid/negative/non-integer numerics, status outside 100–599 | +3 |

Score → severity: `0 none`, `1–2 low`, `3–4 medium`, `5–7 high`, `8+ critical`.
Severity is computed at first detection and never changed by the LLM.

Validation is lenient on purpose: broken numerics are stored as `null` and
flagged, not rejected. Body-level problems (unparseable JSON, empty batch,
over-size batch) return 400; a bad `api_name` rejects only that item while
the rest of the batch continues.

## Incident Lifecycle

```text
observation → detect → store → upsert incident → resolve stale → explain (new only)
```

- Each anomaly maps to a **signature**: `apiName` + sorted anomaly types.
- At most one **active** incident exists per signature (partial unique index).
- A repeat bumps `occurrenceCount` and updates `lastSeenAt` — no new incident,
  no new LLM call.
- After each observation, other active incidents of the same API with a
  different signature resolve automatically (`resolvedBy: auto`); a healthy
  observation resolves all of that API.
- Operators can resolve manually (`PATCH /alerts/:id/resolve`).

## AI Architecture

- One provider behind the `AlertGenerator` interface: Gemini
  (`gemini-3.5-flash-lite`) over plain REST, no SDK. Swapping providers is a
  new file plus one factory line.
- The prompt (versioned `PROMPT_VERSION`) constrains the model to provided
  facts, bans stated root causes ("may indicate" only), and caps output at
  3 sentences of plain text. A 20-observation baseline is attached as context.
- Output is validated (non-empty, ≤400 chars, names the API and status code)
  and the template message is kept on any failure.
- Bounds per request: new incidents only, 5s timeout, concurrency 5, max 10
  calls. AI failure never fails ingestion.

## Security

- Secrets only in environment variables; never logged (the provider key
  travels in the request URL, which is never logged either).
- Request body size limit, CORS, Helmet.
- `express-rate-limit` on `/monitor`, which can trigger paid LLM calls.
- Optional shared-secret `x-api-key` on `POST /monitor`.
- `api_name` charset and length constraint (prompt-injection and UI safety).
- Only anomaly facts are sent to the LLM; operational payloads stay local.
- Sanitized errors: no stacks, connection strings, keys, or paths.

## Testing

- Backend: `npx vitest run` — 57 tests (unit: detector boundaries incl.
  4999/5000/10000, severity map, signature, fallback, output validator;
  integration: ingest incl. reject reasons, dedupe `count:2`, auto-resolve,
  stats, rate-limit, api-key, LLM success/timeout/error/invalid/cap/factory —
  all mocked, no key needed; health readiness).
- Frontend: `npm test` — 12 component tests (api client, badges, table,
  filters, 10s polling + unmount cleanup, resolve-failure banner).

## Quality Gates

Every push and pull request runs GitHub Actions for both applications
(`.github/workflows/ci.yml`).

**Backend**

- dependency installation
- ESLint
- TypeScript type checking
- 57 tests

**Frontend**

- dependency installation
- ESLint
- 12 tests
- production build

## Project Structure

```text
backend/
  src/
    ai/                 provider abstraction (prompts, validator, gemini, factory)
    config/             env, database, logger
    domain/
      anomaly/          pure detection: rules, detector, severity
      alert/            signature, fallback message, generator interface
    errors/             AppError hierarchy
    middleware/         request-id, error-handler, not-found, rate-limit, api-key
    modules/
      monitoring/       ingest route → controller → service + observation model/repo
      alerts/           alerts route → controller → service + alert model/repo
      stats/            24h statistics
    scheduler/          optional traffic simulator
    app.ts              composition root (no listen)
    server.ts           listen + graceful shutdown
  scripts/              static JSON ingest CLI
  data/                 sample-api-responses.json
  tests/                unit + integration
frontend/
  src/
    components/         badges, loading/error/empty states
    features/
      alerts/           table, filters, polling hook
      stats/            stat cards, polling hook
    pages/              dashboard
    services/           REST client
    types/              shared DTOs
docs/
  architecture.md       system architecture reference
  adr/                  architecture decision records
  AI_Prompts.md         development provenance (kept for history)
```

## Architecture Decisions

**Rules detect; AI explains.** The LLM never decides whether an API is
unhealthy or how severe an incident is. Those decisions are deterministic
and testable.

**Incidents, not alert spam.** Repeated observations with the same anomaly
signature update one active incident instead of generating duplicate
alerts or repeated LLM calls.

**AI failure is non-critical.** Every alert receives a deterministic
fallback message first. Gemini may replace it with a richer explanation,
but provider failure never prevents alert creation.

**Bounded AI usage.** Timeouts, concurrency limits, per-request caps, and
deduplication keep LLM latency and cost bounded.

**Store healthy observations too.** Historical observations support
dashboard statistics, recent context for alert explanations, and future
adaptive anomaly detection.

Details: [`docs/adr/`](docs/adr/).

## Known Limitations

Conscious scope decisions:

- No heartbeat/staleness detection: an API that stops reporting is not flagged.
- Global thresholds only; per-API monitoring policies are future work.
- No cross-field consistency rules (for example HTTP 200 with zero records, or 5xx with records returned).
- 401/403/429 are scored like any other 4xx.
- Zero records can be legitimate for some endpoints; the rule has no per-endpoint override.
- Severity is fixed at first detection of an incident; it does not escalate while the incident continues.
- If the anomaly pattern of an API changes, the old incident is resolved and a new one opens.
- Beyond `LLM_MAX_PER_REQUEST` new alerts in one request, extras keep the template message.
- Single-instance deployment; no distributed workers.

Architectural invariants:

```text
Detection ≠ Explanation
Domain logic ≠ HTTP ≠ Database
AI provider ≠ Application
Monitoring availability ≠ LLM availability
One active alert per (API, incident signature)
```

> **The monitoring platform must remain correct even when the AI component is unavailable or incorrect.**

## Roadmap

Near-term:

- per-API monitoring policies (thresholds and rules per API or endpoint)
- heartbeat/staleness detection for silent APIs
- rate-limit-specific rules (e.g. distinct handling for 429)
- richer baseline statistics (percentiles, rolling windows)
- pluggable notification channels (email, webhooks, chat)

Later:

- statistical baselines replacing fixed thresholds
- service dependency correlation across APIs
- distributed ingestion workers
- event-driven processing
- SLO/SLA monitoring and burn-rate alerts

None of the above is implemented yet; the modular monolith keeps each of
them pluggable without redesign.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for setup, workflow, and
pull-request expectations. `docs/AI_Prompts.md` preserves the development
history of this repository, including the runtime prompt shipped in
`backend/src/ai/prompts.ts`.
