# Incidetective

[![CI](https://github.com/Ohshi60/Incidetective/actions/workflows/ci.yml/badge.svg)](https://github.com/Ohshi60/Incidetective/actions/workflows/ci.yml)

**AI-assisted incident investigation for backend services.**

Incidetective is a self-hosted tool that helps developers investigate application failures by combining deterministic log analysis with local AI reasoning.

Import application logs, identify recurring errors, examine supporting evidence, and generate AI-assisted hypotheses with suggested diagnostic steps.

**Status:** Working MVP — under active development.

## Features

- **Incident management:** Create incidents and associate log evidence with them.
- **Real-world log ingestion:** One importer for most formats: JSON lines (Pino, Docker, `journalctl -o json`), key=value logs (Go's slog, logrus, Ollama), syslog and journald, Apache/nginx access logs, and timestamped text such as log4j or Serilog.
- **Error clustering:** Group recurring failures using the Drain algorithm while preserving meaningful error codes.
- **Contextual analysis:** Include preceding warning messages when investigating errors.
- **AI investigation:** Generate possible root causes and diagnostic recommendations using a locally hosted Ollama model.
- **Evidence traceability:** Link AI hypotheses to error findings (`F1`, `F2`) and contextual warnings (`C1`, `C2`).
- **Setup notes:** Tell the AI what's normal for each service (versions, hardware, routine messages), so it stops blaming them.
- **Ruled-out evidence:** The AI lists alarming-looking lines it judged unrelated, with a reason, instead of building hypotheses on them.
- **Web interface:** Explore incidents, failure patterns, original log messages, and AI investigations.

AI-generated findings are hypotheses, not confirmed root causes.

## Tech stack

| Component      | Technology                           |
| -------------- | ------------------------------------ |
| Backend        | Node.js, TypeScript, Fastify         |
| Frontend       | React, Vite, Tailwind CSS, shadcn/ui |
| Database       | PostgreSQL, Drizzle ORM              |
| Log clustering | Drain (`@agentix-e/drain-ts`)        |
| Local AI       | Ollama, Qwen3                        |
| Testing        | Vitest                               |

## How it works

```text
Application logs
       |
       v
 Log normalization
       |
       v
 PostgreSQL storage
       |
       v
 Deterministic analysis
 - Error grouping
 - Frequency and timestamps
 - Contextual warnings
       |
       v
 Ollama / Local LLM
       |
       v
 Investigation report
 - Possible root causes
 - Evidence references
 - Diagnostic steps
```

Deterministic analysis identifies patterns and supporting evidence. The LLM then uses that evidence to propose explanations and next steps.

This separation helps keep investigations grounded in actual log data.

## Getting started

There are two ways to run Incidetective: the whole stack with Docker Compose, or from source for development. Either way you need an [Ollama](https://ollama.com) instance with a model pulled, for example `ollama pull qwen3:4b-instruct`.

### Run with Docker Compose

```bash
git clone https://github.com/Ohshi60/Incidetective.git
cd Incidetective
echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)" > .env
docker compose -f compose.prod.yaml up -d --build
```

Open http://localhost:8080. The API applies database migrations when it starts.

Settings go in `.env`; all of them are optional except `POSTGRES_PASSWORD` (see `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` | Ollama on the Docker host; set it if Ollama runs elsewhere |
| `OLLAMA_MODEL` | `qwen3:4b-instruct` | Model used for investigations |
| `WEB_BIND` / `WEB_PORT` | `127.0.0.1` / `8080` | Where the web UI listens |
| `DATABASE_URL` | the bundled Postgres | Point at your own Postgres instead |

To use your own Postgres, set `DATABASE_URL` and start only the app containers: `docker compose -f compose.prod.yaml up -d --build --no-deps api web`. `POSTGRES_PASSWORD` must still be set, but can be any value.

### Run from source

#### Prerequisites

- Node.js 22+
- Docker with Compose
- An Ollama instance accessible from the backend

#### 1. Install dependencies

```bash
git clone https://github.com/Ohshi60/Incidetective.git
cd Incidetective
npm install
```

#### 2. Start PostgreSQL

```bash
docker compose up -d postgres
cp .env.example .env
```

The included Compose configuration provides a local PostgreSQL development database. The API applies migrations when it starts.

#### 3. Configure Ollama

Install Ollama from https://ollama.com and download a supported model:

```bash
ollama pull qwen3:4b-instruct
```

Configure your root `.env`:

```dotenv
DATABASE_URL=postgresql://incidetective:localdev@localhost:5432/incidetective
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:4b-instruct
```

Ollama can also run on a separate machine, including a homelab server. Set `OLLAMA_BASE_URL` accordingly.

#### 4. Start the backend

```bash
npm run dev
```

The API runs at `http://localhost:3000`.

#### 5. Start the frontend

In a second terminal:

```bash
cd web
npm install
npm run dev
```

Open the URL displayed by Vite.

## Example workflow

1. Create an incident describing an application failure.
2. Upload a log file.
3. Review the deterministic analysis and grouped errors.
4. Click **Investigate with AI**.
5. Examine possible root causes, cited evidence, and suggested diagnostic steps.
6. Expand supporting evidence to inspect original log messages.

## Current limitations

- Logs must currently be imported manually.
- Formats are recognized by common timestamp shapes and field names, not per-application rules; a file with no recognizable timestamp is rejected, and unusual formats may be read with less detail (e.g. every line as `info`).
- Investigations use a selected subset of error findings and contextual warnings.
- AI-generated conclusions may contain incorrect assumptions or diagnostic advice.
- AI investigations are generated on demand and are not persisted.
- Inference speed depends on the hardware running Ollama.
- Authentication and automated log collection are not implemented.

The MVP is intended for local development and trusted environments, not direct public exposure.

## Roadmap

- [x] Persistent incident and log storage
- [x] JSONL and Pino log ingestion
- [x] Plain-text log ingestion
- [x] Format-agnostic log import (JSON, logfmt, syslog, access logs, text)
- [x] Deterministic error clustering
- [x] Local LLM integration
- [x] Evidence-referenced AI investigations
- [ ] Evaluate multiple real-world incident scenarios
- [ ] Guided follow-up investigations
- [ ] Automated log collection
- [ ] Public demo mode
- [x] Self-hosted deployment documentation

## Project goals

Incidetective is both an experimental developer tool and a practical project exploring how deterministic software analysis can complement local large language models.

The goal is not to replace established observability platforms, but to explore a lightweight workflow for investigating failures using accessible, self-hosted technology.
