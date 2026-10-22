import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import type { LogEntry } from "../../src/evidence/evidence.js";

describe("Incident API", () => {
  it("returns logs belonging to a created incident", async () => {
    const app = buildApp();

    try {
      // 1. POST /incidents using app.inject()

      const response = await app.inject({
        method: "POST",
        url: "/incidents",
        payload: {
          title: "Something",
          service: "checkout-api",
          severity: "high",
          description: "HTTP 500 errors increased after deployment",
        },
      });
      expect(response.statusCode).toBe(201);
      const parsedIncident = response.json();
      // 2. Extract the generated incident ID

      // 3. GET /incidents/:id/logs
      const logsResponse = await app.inject({
        method: "GET",
        url: `/incidents/${parsedIncident.id}/logs`,
      });
      const logs = logsResponse.json();
      expect(logsResponse.statusCode).toBe(200);
      expect(logs.length).toBeGreaterThan(0);
      expect(
        logs.every((log: LogEntry) => log.incidentId === parsedIncident.id),
      ).toBe(true);
      // 4. Assert status 200 and correct incidentId
    } finally {
      await app.close();
    }
  });
  it("correctly isolates incidents", async () => {
    const app = buildApp();
    const payload = {
      title: "Something",
      service: "checkout-api",
      severity: "high",
      description: "HTTP 500 errors increased after deployment",
    };
    try {
      const incidentA = await app.inject({
        method: "POST",
        url: "/incidents",
        payload: payload,
      });
      expect(incidentA.statusCode).toBe(201);
      const incidentB = await app.inject({
        method: "POST",
        url: "/incidents",
        payload: payload,
      });
      expect(incidentB.statusCode).toBe(201);
      const parsedA = incidentA.json();
      const parsedB = incidentB.json();

      const incidentALog = await app.inject({
        method: "GET",
        url: `/incidents/${parsedA.id}/logs`,
      });
      expect(incidentALog.statusCode).toBe(200);
      expect(
        incidentALog
          .json()
          .every((log: LogEntry) => log.incidentId === parsedA.id),
      ).toBe(true);
      const incidentBLog = await app.inject({
        method: "GET",
        url: `/incidents/${parsedB.id}/logs`,
      });
      expect(
        incidentBLog
          .json()
          .every((log: LogEntry) => log.incidentId === parsedB.id),
      ).toBe(true);

      expect(incidentBLog.statusCode).toBe(200);

      expect(parsedA.id).not.toBe(parsedB.id);
    } finally {
      await app.close();
    }
  });
  it("returns 404 when requesting logs for an unknown incident", async () => {
    const app = buildApp();
    try {
      const response = await app.inject({
        method: "GET",
        url: `/incidents/${crypto.randomUUID()}/logs`,
      });

      expect(response.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
  it("returns analysis for an existing incident", async () => {
    const app = buildApp();

    try {
      const createResponse = await app.inject({
        method: "POST",
        url: "/incidents",
        payload: {
          title: "Checkout failures",
          service: "checkout-api",
          severity: "high",
          description: "HTTP 500 errors increased",
        },
      });

      expect(createResponse.statusCode).toBe(201);

      const incident = createResponse.json();

      const logsResponse = await app.inject({
        method: "GET",
        url: `/incidents/${incident.id}/logs`,
      });

      expect(logsResponse.statusCode).toBe(200);

      const logs: LogEntry[] = logsResponse.json();

      const response = await app.inject({
        method: "GET",
        url: `/incidents/${incident.id}/analysis`,
      });

      expect(response.statusCode).toBe(200);

      const analysis = response.json();

      expect(analysis.totalLogs).toBe(logs.length);
      expect(analysis.errorCount).toBe(
        logs.filter((log) => log.level === "error").length,
      );
      expect(analysis.warningCount).toBe(
        logs.filter((log) => log.level === "warn").length,
      );
      expect(analysis.affectedServices).toEqual(
        [...new Set(logs.map((log) => log.service))].sort(),
      );
    } finally {
      await app.close();
    }
  });

  it("returns 404 when analyzing an unknown incident", async () => {
    const app = buildApp();

    try {
      const response = await app.inject({
        method: "GET",
        url: `/incidents/${crypto.randomUUID()}/analysis`,
      });

      expect(response.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});
