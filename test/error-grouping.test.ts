import { describe, expect, it } from "vitest";
import { groupErrors } from "../src/analysis/error-grouping.js";
import type { LogEntry } from "../src/evidence/evidence.js";

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
        service: "checkout-api",
        message: "Timeout",
        count: 3,
        firstSeen: "2026-10-22T10:00:00Z",
        lastSeen: "2026-10-22T10:05:00Z",
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
      service: "payment-api",
      message: "Timeout",
      count: 2,
    });
    expect(result[1]).toMatchObject({
      service: "checkout-api",
      message: "Timeout",
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
});
