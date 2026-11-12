# Incidetective

**AI-assisted incident investigation for backend services.**

Incidetective is a self-hosted tool that helps developers investigate application failures by combining deterministic log analysis with local AI reasoning.

Import application logs, identify recurring errors, examine supporting evidence, and generate AI-assisted hypotheses with suggested diagnostic steps.

**Status:** Working MVP — under active development.

## Features

- **Incident management:** Create incidents and associate log evidence with them.
- **Real-world log ingestion:** Import JSONL, Fastify/Pino, and common timestamped text logs.
- **Error clustering:** Group recurring failures using the Drain algorithm while preserving meaningful error codes.
- **Contextual analysis:** Include preceding warning messages when investigating errors.
- **AI investigation:** Generate possible root causes and diagnostic recommendations using a locally hosted Ollama model.
- **Evidence traceability:** Link AI hypotheses to error findings (`F1`, `F2`) and contextual warnings (`C1`, `C2`).
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

### Prerequisites

- Node.js 22+
- Docker with Compose
- An Ollama instance accessible from the backend

### 1. Install dependencies

```bash
git clone https://github.com/Ohshi60/Incidetective.git
cd Incidetective
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d postgres
cp .env.example .env
npx drizzle-kit migrate
```

The included Compose configuration provides a local PostgreSQL development database.

### 3. Configure Ollama

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

### 4. Start the backend

```bash
npm run dev
```

The API runs at `http://localhost:3000`.

### 5. Start the frontend

In a second terminal:

```bash
cd web
npm install
npm run dev
```

Open the URL displayed by Vite.

## Example workflow

1. Create an incident describing an application failure.
2. Upload a JSONL or supported text log file.
3. Review the deterministic analysis and grouped errors.
4. Click **Investigate with AI**.
5. Examine possible root causes, cited evidence, and suggested diagnostic steps.
6. Expand supporting evidence to inspect original log messages.

## Current limitations

- Logs must currently be imported manually.
- Plain-text log support covers common timestamp formats, not every application log format.
- Investigations use a selected subset of error findings and contextual warnings.
- AI-generated conclusions may contain incorrect assumptions or diagnostic advice.
- AI investigations are generated on demand and are not persisted.
- Inference speed depends on the hardware running Ollama.
- Authentication, automated log collection, and production deployment are not implemented.

The MVP is intended for local development and trusted environments, not direct public exposure.

## Roadmap

- [x] Persistent incident and log storage
- [x] JSONL and Pino log ingestion
- [x] Plain-text log ingestion
- [x] Deterministic error clustering
- [x] Local LLM integration
- [x] Evidence-referenced AI investigations
- [ ] Evaluate multiple real-world incident scenarios
- [ ] Guided follow-up investigations
- [ ] Automated log collection
- [ ] Public demo mode
- [ ] Self-hosted deployment documentation

## Project goals

Incidetective is both an experimental developer tool and a practical project exploring how deterministic software analysis can complement local large language models.

The goal is not to replace established observability platforms, but to explore a lightweight workflow for investigating failures using accessible, self-hosted technology.
