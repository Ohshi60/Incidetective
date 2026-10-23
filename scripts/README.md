# Incidetective realistic seed data

Synthetic, plausible application logs for **three separate incidents**, 490 total JSONL entries, spanning multiple services and normal/degraded/recovery phases. No real customer information.

## Install into your repository

- Copy `seed.ts` into `scripts/seed.ts` in your Incidetective repository.
- Copy the `seed/` directory to the repository root (so the JSONL files sit at `seed/*.jsonl`).
- Start your PostgreSQL container and the Fastify API on port 3000.
- From your repo root, run `npx tsx scripts/seed.ts` (or set `API_BASE_URL` if using another port).

The script calls your existing `POST /incidents` and `POST /incidents/:id/logs/import` endpoints. It needs no direct database credentials, schema changes, or extra npm packages (provided you already have `tsx`). It verifies `/health` is reachable first.

**Caution**: This is intentionally append-only: rerunning creates three additional incidents. Run it once in your local development environment. Do not point this at production.

## Included scenarios

1. `checkout-degradation.jsonl` — 180 entries: payment gateway timeouts, checkout 502s, database pool pressure, rollback and recovery.
2. `authentication-spike.jsonl` — 145 entries: login 503s, Redis pool exhaustion, auth session timeouts, configuration reversal.
3. `queue-backlog.jsonl` — 165 entries: upstream HTTP 429s, retry volume, message broker lag, worker concurrency reduction and recovery.

Each JSONL line has exactly `timestamp`, `service`, `level`, `message` fields, using the format accepted by your existing parser.
