import { describe, expect, it } from "vitest";
import { analyseIncident } from "../src/analysis/incident-analysis.js";
import type { LogEntry } from "../src/evidence/evidence.js";

describe("analyzeIncident", () => {
  it("analyzes logs regardless of their order", () => {
    const logs: LogEntry[] = [
      {
        incidentId: "incident-1",
        timestamp: "2026-10-22T10:05:00.000Z",
        service: "payment-api",
        level: "error",
        message: "Payment failed",
      },
      {
        incidentId: "incident-1",
        timestamp: "2026-10-22T10:00:00.000Z",
        service: "checkout-api",
        level: "info",
        message: "Request started",
      },
      {
        incidentId: "incident-1",
        timestamp: "2026-10-22T10:03:00.000Z",
        service: "checkout-api",
        level: "warn",
        message: "Slow response",
      },
      {
        incidentId: "incident-1",
        timestamp: "2026-10-22T10:10:00.000Z",
        service: "payment-api",
        level: "error",
        message: "Connection timeout",
      },
    ];

    const result = analyseIncident(logs);

    expect(result).toEqual({
      totalLogs: 4,
      errorCount: 2,
      warningCount: 1,
      affectedServices: ["checkout-api", "payment-api"],
      firstTimestamp: "2026-10-22T10:00:00.000Z",
      lastTimestamp: "2026-10-22T10:10:00.000Z",
      errorGroups: [
        {
          service: "payment-api",
          normalizedMessage: "Connection timeout",
          count: 1,
          firstSeen: "2026-10-22T10:10:00.000Z",
          lastSeen: "2026-10-22T10:10:00.000Z",
        },
        {
          service: "payment-api",
          normalizedMessage: "Payment failed",
          count: 1,
          firstSeen: "2026-10-22T10:05:00.000Z",
          lastSeen: "2026-10-22T10:05:00.000Z",
        },
      ],
    });
  });

  it("handles empty evidence", () => {
    expect(analyseIncident([])).toEqual({
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      affectedServices: [],
      firstTimestamp: null,
      lastTimestamp: null,
      errorGroups: [],
    });
  });
});
