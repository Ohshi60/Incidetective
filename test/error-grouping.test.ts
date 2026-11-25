import { describe, expect, it } from "vitest";
import { groupErrors, groupLogs } from "../src/analysis/error-grouping.js";
import { generateReport } from "../src/analysis/reports/generate-report.js";
import type { LogEntry } from "../shared/types/evidence.js";

const makeLog = (
  service: string,
  message: string,
  timestamp: string,
  level: LogEntry["level"] = "error",
): LogEntry => ({
  incidentId: "incident-1",
  service,
  message,
  timestamp,
  level,
});

describe("groupErrors", () => {
  it("groups repeated errors and tracks timestamps", () => {
    const logs = [
      makeLog("checkout-api", "Timeout", "2026-10-22T10:05:00Z"),
      makeLog("checkout-api", "Timeout", "2026-10-22T10:00:00Z"),
      makeLog("checkout-api", "Timeout", "2026-10-22T10:03:00Z"),
    ];

    expect(groupErrors(logs)).toEqual([
      {
        level: "error",
        service: "checkout-api",
        normalizedMessage: "Timeout",
        count: 3,
        firstSeen: "2026-10-22T10:00:00Z",
        lastSeen: "2026-10-22T10:05:00Z",
        evidence: logs.filter((log) => log.level === "error"),
      },
    ]);
  });

  it("separates services and sorts by count", () => {
    const logs = [
      makeLog("checkout-api", "Timeout", "2026-10-22T10:00:00Z"),
      makeLog("payment-api", "Timeout", "2026-10-22T10:01:00Z"),
      makeLog("payment-api", "Timeout", "2026-10-22T10:02:00Z"),
    ];

    const result = groupErrors(logs);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      level: "error",
      service: "payment-api",
      normalizedMessage: "Timeout",
      count: 2,
    });
    expect(result[1]).toMatchObject({
      level: "error",
      service: "checkout-api",
      normalizedMessage: "Timeout",
      count: 1,
    });
  });

  it("ignores non-errors and handles empty input", () => {
    const logs = [
      makeLog("checkout-api", "Started", "2026-10-22T10:00:00Z", "info"),
      makeLog("checkout-api", "Slow", "2026-10-22T10:01:00Z", "warn"),
    ];

    expect(groupErrors(logs)).toEqual([]);
    expect(groupErrors([])).toEqual([]);
  });
  it("groups errors with different request IDs", () => {
    const logs = [
      makeLog("checkout-api", "Request 123 timed out", "2026-10-22T10:00:00Z"),
      makeLog("checkout-api", "Request 456 timed out", "2026-10-22T10:01:00Z"),
    ];

    expect(groupErrors(logs)).toEqual([
      {
        level: "error",
        service: "checkout-api",
        normalizedMessage: "Request <NUM> timed out",
        count: 2,
        firstSeen: "2026-10-22T10:00:00Z",
        lastSeen: "2026-10-22T10:01:00Z",
        evidence: logs,
      },
    ]);
  });
});

describe("groupLogs", () => {
  it("clusters warnings separately from errors", () => {
    const logs = [
      makeLog(
        "hdfs",
        "Failed to connect to /10.0.0.1:50010",
        "2026-10-22T10:00:00Z",
        "warn",
      ),
      makeLog(
        "hdfs",
        "Failed to connect to /10.0.0.2:50010",
        "2026-10-22T10:01:00Z",
        "warn",
      ),
      makeLog("hdfs", "Job failed", "2026-10-22T10:02:00Z", "error"),
    ];

    const warnings = groupLogs(logs, "warn");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ level: "warn", count: 2 });
    expect(groupLogs(logs, "error")).toEqual([
      expect.objectContaining({
        level: "error",
        normalizedMessage: "Job failed",
      }),
    ]);
  });
});

describe("generateReport", () => {
  it("lists error findings before warning findings", () => {
    const logs = [
      makeLog("hdfs", "Slow read", "2026-10-22T10:00:00Z", "warn"),
      makeLog("hdfs", "Slow read", "2026-10-22T10:00:01Z", "warn"),
      makeLog("hdfs", "Slow read", "2026-10-22T10:00:02Z", "warn"),
      makeLog("hdfs", "Job failed", "2026-10-22T10:02:00Z", "error"),
    ];
    const report = generateReport(
      {
        id: "incident-1",
        title: "t",
        service: "hdfs",
        severity: "high",
        description: "d",
        createdAt: "2026-10-22T09:00:00Z",
      },
      logs,
    );

    expect(report.findings.map((f) => [f.level, f.pattern])).toEqual([
      ["error", "Job failed"],
      ["warn", "Slow read"],
    ]);
  });
});
