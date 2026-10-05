# SentraPulse — Intelligent API Monitoring & Alert System

Monitors API telemetry, detects anomalies with **deterministic rules**, groups
repeats into incidents, and uses an LLM to write a short human-readable
explanation per incident — with a template fallback so monitoring stays
correct when the LLM is unavailable or wrong.

> **Detection is deterministic. The LLM only explains.**

Modular monolith: one Express backend, one MongoDB, one React dashboard.
Full design: [`docs/architecture.md`](docs/architecture.md).

## Quick start (zero setup)

```bash
docker compose up --build
```

- Dashboard: http://localhost:5173 (polls every 10s)
- API: http://localhost:4000/api/v1 (aliases `/monitor`, `/alerts` also work)
- `LLM_PROVIDER=none` by default — full system runs with no API key.
- The simulator (`SIMULATOR_ENABLED=true`) generates traffic so alerts appear.

## Secrets (`.env`, gitignored)

One line still runs everything. Secrets live in the root `.env`
(never committed — see `.gitignore`); missing file = defaults above.

```bash
# enable live AI explanations (free key: https://aistudio.google.com/apikey)
# edit .env: LLM_PROVIDER=gemini, GEMINI_API_KEY=<key>
docker compose up --build -d
```

```bash
# optional: lock down ingest with a shared secret
# edit .env: INGEST_API_KEY=<secret>  →  POST /monitor needs header x-api-key
```

## Local development

Requirements: Node.js >= 20. MongoDB via Docker:

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

## How it works

1. `POST /monitor` accepts one observation or a batch (also
   `npm run ingest -- <file>`, or the built-in simulator).
2. Lenient validation: broken numerics → stored as `null` + flagged
   `MALFORMED_RESPONSE`; only a bad `api_name` rejects the item.
3. Pure-function detection + risk score + severity, stored via one
   `insertMany`.
4. Repeats upsert one **active** alert per `(apiName, signature)`
   (`occurrenceCount++`, no new LLM call); other active alerts of that API
   auto-resolve; healthy observations resolve all of that API.
5. NEW alerts only get one bounded LLM attempt (timeout 5s, concurrency 5,
   max 10/request) with output validation; anything else keeps the template
   message. An LLM failure never fails the request.

## REST API

Same routers at `/api/v1` and `/` — the brief's paths work as written.

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

# batch (brief example)
curl -X POST localhost:4000/api/v1/monitor -H 'Content-Type: application/json' \
  -d '[{"api_name":"PatientDataAPI","response_time_ms":1200,"status_code":200,"records_returned":50},{"api_name":"AppointmentAPI","response_time_ms":5500,"status_code":500,"records_returned":0}]'

# active alerts + stats + resolve
curl 'localhost:4000/api/v1/alerts?status=active'
curl localhost:4000/api/v1/stats
curl -X PATCH localhost:4000/api/v1/alerts/<id>/resolve
```

Response envelope: `{ "success": true, "summary": {...}, "results": [...] }`
(errors: `{ "success": false, "error": { "code", "message", "requestId" } }`).

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

## Anomaly rules & severity

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

## Known limitations

Conscious scope decisions for the assessment:

- No heartbeat/staleness detection: an API that stops reporting is not flagged.
- Global thresholds only; per-API thresholds are future work.
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

## Tests

- Backend: `npx vitest run` — 57 tests (unit: detector boundaries incl.
  4999/5000/10000, severity map, signature, fallback, output validator;
  integration: ingest incl. reject reasons, dedupe `count:2`, auto-resolve,
  stats, rate-limit, api-key, LLM success/timeout/error/invalid/cap/factory —
  all mocked, no key needed; health readiness).
- Frontend: `npm test` — 12 component tests (api client, badges, table,
  filters, 10s polling + unmount cleanup, resolve-failure banner).

## Submission

- Video (5–10 min): architecture → simulator → alert → dedupe (`count++`) →
  recovery → AI vs Template badge → key decisions.
- `AI_Prompts.docx`: prompts used while building **plus** the runtime prompt
  (`backend/src/ai/prompts.ts`, version `v1`).
- Email: GitHub link + Drive link (video + prompts file).
