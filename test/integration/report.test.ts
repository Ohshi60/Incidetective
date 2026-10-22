import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import type { InvestigationReport } from "../../src/analysis/reports/investigation-report.js";

describe("Investigation report API", () => {
  it("generates an evidence-backed report for an existing incident", async () => {
    const app = buildApp();

    try {
      const created = await app.inject({
        method: "POST",
        url: "/incidents",
        payload: {
          title: "Checkout requests failing",
          service: "checkout-api",
          severity: "high",
          description: "HTTP 500 errors increased after deployment",
        },
      });

      expect(created.statusCode).toBe(201);
      const incident = created.json<{ id: string }>();

      const response = await app.inject({
        method: "GET",
        url: `/incidents/${incident.id}/report`,
      });

      expect(response.statusCode).toBe(200);
      const report = response.json<InvestigationReport>();

      expect(report).toMatchObject({
        incidentId: incident.id,
        title: "Checkout requests failing",
        service: "checkout-api",
        severity: "high",
      });
      expect(Number.isNaN(Date.parse(report.generatedAt))).toBe(false);
      expect(report.summary.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(report.findings)).toBe(true);
      expect(report.findings.length).toBeGreaterThan(0);

      for (const finding of report.findings) {
        expect(finding.occurrences).toBeGreaterThan(0);
        expect(finding.evidence.length).toBeGreaterThan(0);
        expect(finding.evidence.length).toBeLessThanOrEqual(3);
        expect(
          finding.evidence.every((log) => log.timestamp && log.message),
        ).toBe(true);
      }
    } finally {
      await app.close();
    }
  });

  it("returns 404 for a report belonging to an unknown incident", async () => {
    const app = buildApp();

    try {
      const response = await app.inject({
        method: "GET",
        url: `/incidents/${randomUUID()}/report`,
      });

      expect(response.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});
