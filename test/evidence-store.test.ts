import { beforeEach, describe, expect, it } from "vitest";
import { getSampleLogs } from "../src/evidence/sample-logs.js";
import {
  addLogEntry,
  clearLog,
  fetchIncidentLogs,
  fetchLogs,
} from "../src/evidence/evidence-store.js";
import { randomUUID } from "node:crypto";
import type { LogEntry } from "../src/evidence/evidence.js";

describe("addLog", () => {
  beforeEach(() => {
    clearLog();
  });
  it("adds the log to the db", () => {
    const sample: LogEntry = {
      incidentId: randomUUID(),
      timestamp: "2026-10-21T10:00:00.000Z",
      service: "checkout-service",
      level: "error",
      message: "Request timeout",
    };
    const entry = addLogEntry(sample);

    expect(entry.message).toBe(sample.message);
    expect(entry.service).toBe(sample.service);
    expect(entry.level).toBe(sample.level);
  });
});

describe("getLogs", () => {
  beforeEach(() => {
    clearLog();
  });
  it("returns empty array when log is empty", () => {
    const logs = fetchLogs();

    expect(logs.length).toEqual(0);
  });
  it("returns all the logs when populated", () => {
    const samples = getSampleLogs();
    samples.map((sample) => {
      addLogEntry(sample);
    });

    const logs = fetchLogs();

    expect(logs.length).toEqual(5);
    expect(logs).toEqual(expect.arrayContaining(samples));
  });
});

describe("fetchIncidentLogs", () => {
  beforeEach(() => {
    clearLog();
  });
  it("returns empty array incidentId is not found", () => {
    const logs = fetchIncidentLogs("invalid");

    expect(logs.length).toEqual(0);
  });
  it("returns all the logs belonging to an incidentId", () => {
    const incidentA = "incident-a";
    const incidentB = "incident-b";

    const logA: LogEntry = {
      incidentId: incidentA,
      timestamp: "2026-10-21T10:00:00.000Z",
      service: "checkout-service",
      level: "error",
      message: "Checkout requests failing",
    };

    const logB: LogEntry = {
      incidentId: incidentB,
      timestamp: "2026-10-21T11:00:00.000Z",
      service: "payment-service",
      level: "error",
      message: "Payment requests failing",
    };

    addLogEntry(logA);
    addLogEntry(logB);

    expect(fetchIncidentLogs(incidentA)).toEqual([logA]);
    expect(fetchIncidentLogs(incidentB)).toEqual([logB]);
  });
});
