# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Incidetective is a self-hosted incident investigation tool. Users create incidents, upload logs, view a deterministic analysis (Drain-based error clustering), then request an AI investigation from a local Ollama model. AI output is a hypothesis, never a confirmed root cause; keep the UI and prompts consistent with that.

Two separate npm projects: the backend at the repo root (Fastify + Drizzle/Postgres) and the frontend in `web/` (React 19 + Vite + Tailwind v4 + shadcn/ui + TanStack Query). Each has its own `package.json` and lockfile.

## Commands

Backend (repo root):

```bash
docker compose up -d postgres   # local dev DB on 127.0.0.1:5432
npx drizzle-kit migrate         # apply migrations in ./drizzle
npx drizzle-kit generate        # create a migration after editing src/db/schema.ts
npm run dev                     # tsx watch src/server.ts, API on :3000
npm run typecheck
npm run lint                    # ESLint; root config ignores web/
npm run build                   # tsc -p tsconfig.build.json -> dist/
npm test                        # vitest run
npx vitest run test/error-grouping.test.ts   # single file
npx vitest run -t "creates incident"         # single test by name
npx tsx scripts/seed.ts         # seed 3 demo incidents via the running API (append-only; never against prod)
```

Frontend (`web/`): `npm run dev`, `npm run build` (`tsc -b && vite build`), `npm run lint` (ESLint).

Each project has its own `eslint.config.js`, and ESLint 10 uses the nearest config for each file. The backend stays on TypeScript 6.0 because typescript-eslint doesn't support TypeScript 7.

Production: `docker compose -f compose.prod.yaml up -d --build` runs postgres, then a one-shot `migrate` service (`scripts/migrate.mjs`), then `api`, then `web` (nginx on 127.0.0.1:8080). Needs `POSTGRES_PASSWORD` and `DATABASE_URL`.

`infra/terraform/` provisions a VM on the author's Proxmox homelab. It's one deployment target, not part of the app: the app must not depend on it, and running locally or with Compose never needs it.

## Testing

- Tests need Docker. `test/global-setup.ts` starts a throwaway `postgres:17` container with Testcontainers, runs the Drizzle migrations, and passes the URL through vitest `provide`/`inject`. `test/setup.ts` sets `DATABASE_URL` before `src/db/client.ts` is imported. Tests never touch the dev database.
- `fileParallelism: false`: all test files share one DB, and tests clear it with `db.delete(incidents)` in `beforeEach` (logs and diagnostics cascade).
- HTTP tests call `buildApp()` and use `app.inject(...)`, so no server is started.

## Architecture

Request flow (all routes are in `src/app.ts`; `src/server.ts` only listens):

1. **Ingestion**: `POST /incidents/:id/logs/import` (multipart, 1 MiB, one file) → `src/evidence/log-ingestion.ts`. It picks the parser by sniffing the first non-empty line: `{` → `parseJsonL` (`log-import.ts`, JSONL/Pino), otherwise `parseTextLog` (`text-log-import.ts`, timestamped text). Parsers default `service` to the incident's service and normalize to `LogEntry`. Parse failures throw `LogImportError` with a line number, which becomes a 400.
2. **Storage**: `src/db/schema.ts` has three tables: `incidents`, `logs`, `diagnostic_evidence`. Children cascade on incident delete. Timestamps use `mode: "string"`, so code compares ISO strings with `localeCompare` instead of using `Date`. Data access goes through the `*-store.ts` modules.
3. **Deterministic analysis**: `analyseIncident` (`src/analysis/incident-analysis.ts`) computes counts and the time range, then calls `groupErrors` (`error-grouping.ts`). `groupErrors` keeps one Drain `TemplateMiner` per `[service, errorCodes]` key, so errors with different Node error codes (ECONNREFUSED, ETIMEDOUT…) never merge. Codes that Drain masked are appended back to the pattern. `generateReport` (`analysis/reports/generate-report.ts`) turns the error groups into `findings`.
4. **AI investigation**: `POST /incidents/:id/ai-investigation` → `src/ai/investigate.ts`. It builds evidence with stable IDs and makes one non-streaming Ollama `/api/chat` call with a JSON-schema `format`:
   - `F1..F5`: the top 5 findings
   - `C1..C12`: `warn` logs from up to 5 minutes before any error
   - `D1..D2`: the last 2 uploaded diagnostic files, truncated head/tail

   Afterward it validates the response and drops any `evidenceIds` that weren't supplied. Input sizes and model options (`num_ctx` 4096, 300s timeout) are tuned for CPU inference on a small model (default `qwen3:4b-instruct`), so be careful about growing the prompt. Investigations are not persisted. Ollama failures return 502.

   The goal is to make the LLM provider swappable later. Ollama is the current backend, so keep new Ollama-specific code inside `src/ai/` instead of spreading it through routes or analysis.

Shared types live in `shared/types/*` and both projects import them by relative path. Backend imports need `.js` extensions (`module: nodenext`, `verbatimModuleSyntax`). Web imports omit the extension. The backend tsconfig is strict, including `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.

Frontend calls go to `/api/*`. In dev the Vite proxy strips `/api` and forwards to `localhost:3000`. In prod nginx (`web/nginx.conf`) does the same to `api:3000` with a 330s read timeout to cover slow AI calls. API client functions live in `web/src/api/`, and `@/` aliases `web/src`. `web/src/components/ui/` contains generated shadcn components.

## Environment

Root `.env` (see `.env.example`): `DATABASE_URL`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`. Ollama often runs on a separate machine; `compose.prod.yaml` hardcodes its address.
