import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_MIB, buildApp } from "../../src/app.js";
import type { LogEntry } from "../../shared/types/evidence.js";

const incidentPayload = {
  title: "Checkout errors",
  service: "checkout-api",
  severity: "high",
  description: "Elevated error rate after deployment",
};

const validJsonl = [
  JSON.stringify({
    timestamp: "2026-10-23T10:00:00Z",
    service: "checkout-api",
    level: "error",
    message: "Database connection timeout",
  }),
  JSON.stringify({
    timestamp: "2026-10-23T10:00:02Z",
    service: "payment-api",
    level: "warn",
    message: "Payment request delayed",
  }),
].join("\n");

// Build multipart/form-data ourselves so tests don't need another dependency.
function uploadPayload(content: string) {
  const boundary = `incident-test-${randomUUID()}`;
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\n` +
        'Content-Disposition: form-data; name="file"; filename="logs.jsonl"\r\n' +
        "Content-Type: application/x-ndjson\r\n\r\n",
    ),
    Buffer.from(content, "utf8"),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  return {
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    payload: body,
  };
}

describe("POST /incidents/:id/logs/import", () => {
  it("imports JSONL evidence into an incident and makes it available to the report", async () => {
    const app = buildApp();
    try {
      const created = await app.inject({
        method: "POST",
        url: "/incidents",
        payload: incidentPayload,
      });
      expect(created.statusCode).toBe(201);
      const { id } = created.json<{ id: string }>();

      const uploaded = await app.inject({
        method: "POST",
        url: `/incidents/${id}/logs/import`,
        ...uploadPayload(validJsonl),
      });
      expect(uploaded.statusCode).toBe(201);
      expect(uploaded.json()).toEqual({ imported: 2 });

      const logsResponse = await app.inject({
        method: "GET",
        url: `/incidents/${id}/logs`,
      });
      expect(logsResponse.statusCode).toBe(200);
      const logs = logsResponse.json<LogEntry[]>();
      expect(logs).toHaveLength(2);
      expect(logs.every((log) => log.incidentId === id)).toBe(true);
      expect(logs[0]).toMatchObject({
        timestamp: "2026-10-23T10:00:00.000Z",
        service: "checkout-api",
        level: "error",
        message: "Database connection timeout",
      });

      const reportResponse = await app.inject({
        method: "GET",
        url: `/incidents/${id}/report`,
      });
      expect(reportResponse.statusCode).toBe(200);
      const report = reportResponse.json<{
        findings: { pattern: string; occurrences: number }[];
      }>();
      expect(report.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            pattern: "Database connection timeout",
            occurrences: 1,
          }),
        ]),
      );
    } finally {
      await app.close();
    }
  });

  it("rejects a file without timestamps with 400 and stores nothing", async () => {
    const app = buildApp();
    try {
      const created = await app.inject({
        method: "POST",
        url: "/incidents",
        payload: incidentPayload,
      });
      const { id } = created.json<{ id: string }>();
      const uploaded = await app.inject({
        method: "POST",
        url: `/incidents/${id}/logs/import`,
        ...uploadPayload("just some text\nwithout any times"),
      });
      expect(uploaded.statusCode).toBe(400);
      expect(uploaded.json()).toMatchObject({
        error: "Invalid log file",
        line: 1,
      });

      const logsResponse = await app.inject({
        method: "GET",
        url: `/incidents/${id}/logs`,
      });
      expect(logsResponse.json()).toEqual([]);
    } finally {
      await app.close();
    }
  });

  it("imports a syslog file, using each program as the service", async () => {
    const app = buildApp();
    try {
      const created = await app.inject({
        method: "POST",
        url: "/incidents",
        payload: incidentPayload,
      });
      const { id } = created.json<{ id: string }>();
      const uploaded = await app.inject({
        method: "POST",
        url: `/incidents/${id}/logs/import`,
        ...uploadPayload(
          "Nov 12 13:10:20 pve sshd[123]: Accepted publickey\n" +
            "Nov 12 13:10:21 pve kernel: EXT4-fs error (device sda1): unable to read inode",
        ),
      });
      expect(uploaded.statusCode).toBe(201);

      const logsResponse = await app.inject({
        method: "GET",
        url: `/incidents/${id}/logs`,
      });
      expect(
        logsResponse.json<LogEntry[]>().map((log) => [log.service, log.level]),
      ).toEqual([
        ["sshd", "info"],
        ["kernel", "error"],
      ]);
    } finally {
      await app.close();
    }
  });

  it("returns 404 for an unknown incident", async () => {
    const app = buildApp();
    try {
      const response = await app.inject({
        method: "POST",
        url: `/incidents/${randomUUID()}/logs/import`,
        ...uploadPayload(validJsonl),
      });
      expect(response.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });

  it("imports a file with more entries than one SQL statement can hold", async () => {
    // 20,000 rows x 5 columns is over PostgreSQL's 65,535-parameter limit
    // per statement, so this only works with chunked inserts.
    const lines = Array.from({ length: 20_000 }, (_, i) =>
      JSON.stringify({
        timestamp: new Date(Date.UTC(2026, 9, 23, 10, 0, 0, i)).toISOString(),
        level: i % 100 === 0 ? "error" : "info",
        message: `Request ${i} handled`,
      }),
    ).join("\n");

    const app = buildApp();
    try {
      const created = await app.inject({
        method: "POST",
        url: "/incidents",
        payload: incidentPayload,
      });
      const { id } = created.json<{ id: string }>();
      const uploaded = await app.inject({
        method: "POST",
        url: `/incidents/${id}/logs/import`,
        ...uploadPayload(lines),
      });
      expect(uploaded.statusCode).toBe(201);
      expect(uploaded.json()).toEqual({ imported: 20_000 });

      const logsResponse = await app.inject({
        method: "GET",
        url: `/incidents/${id}/logs`,
      });
      expect(logsResponse.json<LogEntry[]>()).toHaveLength(20_000);
    } finally {
      await app.close();
    }
  });

  it(`rejects files over ${MAX_UPLOAD_MIB} MiB`, async () => {
    const app = buildApp();
    try {
      const created = await app.inject({
        method: "POST",
        url: "/incidents",
        payload: incidentPayload,
      });
      const { id } = created.json<{ id: string }>();
      const response = await app.inject({
        method: "POST",
        url: `/incidents/${id}/logs/import`,
        ...uploadPayload("x".repeat(MAX_UPLOAD_MIB * 1024 * 1024 + 1)),
      });
      expect(response.statusCode).toBe(413);
      expect(response.json()).toMatchObject({
        error: `File exceeds the ${MAX_UPLOAD_MIB} MiB upload limit`,
      });
    } finally {
      await app.close();
    }
  });
});
