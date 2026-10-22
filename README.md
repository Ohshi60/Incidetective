# Incidetective

Incidetective is a TypeScript/Fastify backend for investigating incidents in backend services. It associates logs with incidents, identifies recurring errors, and produces structured investigation reports with supporting evidence.

The current MVP uses **synthetic logs and deterministic analysis**. It runs locally without a database, an AI API key, or paid services. AI-assisted investigation is a future goal, not an implemented feature.

## What it does

- Create and list incidents, including their service, severity, and description.
- Associate synthetic log evidence with each newly created incident.
- Retrieve logs associated with a specific incident.
- Summarize error/warning counts, affected services, and time ranges.
- Group recurring error messages by service, normalizing UUIDs and numeric identifiers.
- Generate investigation reports that rank error patterns and include up to three original log entries per finding.

Reports describe observed evidence; they **do not assert a root cause**.

## Tech stack

- Node.js, TypeScript, Fastify
- Vitest for unit and API integration tests
- In-memory incident and evidence stores

## Getting started

Prerequisites: Node.js 22 or later and npm.

```bash
npm install
npm run dev
```

The server listens on `http://localhost:3000`.

For a single run without watch mode:

```bash
npm start
```

Run checks:

```bash
npm test
npm run typecheck
```

## API

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `POST` | `/incidents` | Create an incident and attach synthetic evidence |
| `GET` | `/incidents` | List incidents |
| `GET` | `/incidents/:id` | Retrieve one incident |
| `GET` | `/incidents/:id/logs` | Retrieve its log evidence |
| `GET` | `/incidents/:id/analysis` | Get deterministic statistics and error groups |
| `GET` | `/incidents/:id/report` | Generate a structured investigation report |

The incident-specific GET endpoints return `404` when the incident ID does not exist.

### Example workflow

**1. Create an incident**

```bash
curl -s -X POST http://localhost:3000/incidents \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Checkout requests failing",
    "service": "checkout-api",
    "severity": "high",
    "description": "HTTP 500 errors increased after deployment"
  }'
```

The response includes a generated `id`. Copy that ID for the next requests (substitute it for `<incident-id>`).

Valid severity values: `low`, `medium`, `high`, `critical`.

**2. Inspect evidence and analysis**

```bash
curl -s http://localhost:3000/incidents/<incident-id>/logs
curl -s http://localhost:3000/incidents/<incident-id>/analysis
```

**3. Generate the investigation report**

```bash
curl -s http://localhost:3000/incidents/<incident-id>/report
```

The JSON report contains incident metadata (`incidentId`, `title`, `service`, `severity`), a `generatedAt` timestamp, a human-readable `summary`, and a `findings` array. Each finding describes an error pattern, its occurrence count and time range, and up to three original matching log messages.

## How investigation works

1. `POST /incidents` creates an incident and loads synthetic evidence for its ID.
2. Analysis counts log levels, finds the observation window, and identifies services.
3. Error grouping normalizes UUIDs and standalone numeric values before grouping messages by service and normalized pattern.
4. Report generation ranks the patterns, selects a few original log entries as evidence, and writes a deterministic summary.

## Current limitations

- **Synthetic evidence only:** no external log ingestion yet.
- **In-memory storage:** incidents and logs are lost when the process restarts; no persistent database.
- **No AI integration yet:** normalization and summaries are rule-based, not model-generated.
- **Simple matching:** messages are grouped by exact normalized text, not semantic similarity; normalization can also merge messages with meaningfully different numbers.
- **Development MVP:** authentication, authorization, and production deployment are not implemented.

## Next steps

The next milestone is a small frontend that demonstrates creating an incident, inspecting error patterns, and viewing its evidence-backed report. Persistent storage and real log ingestion can follow once that workflow is demonstrable end to end.
