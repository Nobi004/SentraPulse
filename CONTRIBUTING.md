# Contributing to SentraPulse

## Prerequisites

- Node.js >= 20
- Docker Desktop (for MongoDB and the full stack)
- A Gemini API key (optional — everything runs fallback-only without one)

## Local setup

```bash
docker run -d --name sentrapulse-mongo -p 27017:27017 mongo:7
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

Copy `.env.example` to `.env` (root) or `backend/.env` for local secrets.
Never commit `.env` files.

## Branch workflow

- One short-lived branch per change, opened against `main`.
- One concern per pull request; keep diffs reviewable.

## Lint / test / build requirements

Every PR must pass what CI runs:

```bash
# backend
npm run lint && npx tsc --noEmit && npm test && npm run build
# frontend
npm run lint && npm test && npm run build
```

Backend tests use an in-memory database — no local Mongo needed for `vitest`.
New behavior needs tests first (failing test watched to fail, minimal code,
full suite green); pure refactors must keep the suite green.

## Architecture boundaries

Respect the dependency direction — it is enforced by review, not tooling:

```text
routes → controllers → services → (domain | repositories | ai)
```

- `backend/src/domain/` stays pure: no Express, Mongoose, or LLM SDK imports.
- Persistence goes through module repositories, never around them.
- The LLM may only replace an alert's message text, never decide health,
  severity, or resolution.

## Pull request expectations

- Describe the problem, the change, and how it was verified (tests + commands).
- Update `README.md` / `docs/architecture.md` / ADRs when behavior or
  contracts change.
- Keep AI usage bounded and deterministic-first; document prompt changes in
  `backend/src/ai/prompts.ts` (`PROMPT_VERSION`) like any other code change.
