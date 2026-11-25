# Fixtures

Sample files for trying out uploads by hand in the UI. Nothing in the code or tests reads them. For demo data loaded through the API, see `seed/` and `scripts/seed.ts`.

| File | Format | Upload as | What it shows |
| --- | --- | --- | --- |
| `sample.jsonl` | JSONL | Logs | Minimal two-line example of the JSONL format |
| `pino-sample.jsonl` | Pino JSON | Logs | Fastify/Pino output, including numeric levels and `err` objects |
| `incident-initial.log` | Text | Logs | Auth service starts timing out on Redis (`ETIMEDOUT`) |
| `incident-followup.log` | Text | Logs | Same incident a few seconds later: pool exhausted, `ECONNREFUSED` |
| `diagnostic-test.txt` | Plain text | Diagnostics | Redis connection pool output that supports the incident above |
| `jellyfin-2026-11-12.log` | Text | Logs | Real Jellyfin server log (about 200 lines), for testing the text parser on real-world output |

`incident-initial.log`, `incident-followup.log` and `diagnostic-test.txt` together form one scenario. Upload both logs and the diagnostic file to a single incident, then run the AI investigation.
