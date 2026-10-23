/**
 * Seed Incidetective through its existing HTTP API.
 *
 * Usage (from repository root, with Fastify running):
 *   npx tsx scripts/seed.ts
 *   API_BASE_URL=http://localhost:3000 npx tsx scripts/seed.ts
 *
 * WARNING: Running again creates three NEW incidents and imports the same logs again.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const baseUrl = (process.env.API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const scenarios = [
  {
    file: "checkout-degradation.jsonl",
    incident: {
      title: "Checkout errors following payment gateway rollout",
      service: "checkout-api",
      severity: "high",
      description:
        "Intermittent 502s during checkout after payment-service rollout. Payment gateway timeouts coincide with elevated checkout latency; logs include the rollback and recovery period.",
    },
  },
  {
    file: "authentication-spike.jsonl",
    incident: {
      title: "Authentication failures after cache configuration change",
      service: "auth-service",
      severity: "critical",
      description:
        "Login requests fail intermittently after reducing the Redis client connection pool. Session lookups time out and API gateway returns 503s before the configuration is reverted.",
    },
  },
  {
    file: "queue-backlog.jsonl",
    incident: {
      title: "Order queue backlog during inventory throttling",
      service: "order-worker",
      severity: "medium",
      description:
        "Inventory service HTTP 429 responses trigger retries and increasing message broker consumer lag. Reduced worker concurrency allows the queue to recover.",
    },
  },
] as const;

async function api(path: string, init: RequestInit): Promise<Response> {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`${init.method ?? "GET"} ${path}: HTTP ${response.status} ${details}`);
  }
  return response;
}

async function main() {
  // Fail fast if Fastify isn't available.
  await api("/health", { method: "GET" });

  for (const scenario of scenarios) {
    const created = await api("/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scenario.incident),
    });
    const incident = (await created.json()) as { id: string };
    if (!incident.id) throw new Error("Create incident response had no id");

    const bytes = await readFile(
      fileURLToPath(new URL(`../seed/${scenario.file}`, import.meta.url)),
    );
    const form = new FormData();
    form.append("file", new Blob([bytes.toString("utf8")], { type: "application/x-ndjson" }), scenario.file);

    const uploaded = await api(`/incidents/${incident.id}/logs/import`, {
      method: "POST",
      body: form,
    });
    const result = (await uploaded.json()) as { imported: number };
    console.log(`${scenario.incident.title}\n  incident: ${incident.id}\n  imported: ${result.imported} logs`);
  }

  console.log("\nSeed completed. Open the frontend to investigate these incidents.");
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
