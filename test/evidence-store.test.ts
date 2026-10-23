import { beforeEach, describe, expect, it } from "vitest";
import { getSampleLogs } from "../src/evidence/sample-logs.js";
import {
  addLogEntry,
  batchInsertLogs,
  fetchIncidentLogs,
  fetchLogs,
} from "../src/evidence/evidence-store.js";
import { randomUUID } from "node:crypto";
import type { LogEntry } from "../shared/types/evidence.js";
import { db } from "../src/db/client.js";
import { incidents } from "../src/db/schema.js";
import { createIncident } from "../src/incidents/incident-store.js";

describe("addLog", () => {
  beforeEach(async () => {
    await db.delete(incidents);
  });
  it("adds the log to the db", async () => {
    const incident = await createIncident({
      title: "Deployment failure",
      service: "deploy-service",
      severity: "high",
      description: "Test incident",
    });
    const sample: LogEntry = {
      incidentId: incident.id,
      timestamp: "2026-10-21T10:00:00.000Z",
      service: "checkout-service",
      level: "error",
      message: "Request timeout",
    };
    const entry = await addLogEntry(sample);

    expect(entry).toEqual(sample);
  });
});

describe("getLogs", () => {
  beforeEach(async () => {
    await db.delete(incidents);
  });
  it("returns empty array when log is empty", async () => {
    const logs = await fetchLogs();

    expect(logs.length).toEqual(0);
  });
  it("returns all the logs when populated", async () => {
    const incident = await createIncident({
      title: "Deployment failure",
      service: "deploy-service",
      severity: "high",
      description: "Test incident",
    });
    const samples = getSampleLogs().map((log) => ({
      ...log,
      incidentId: incident.id,
    }));

    await batchInsertLogs(samples);
    const logs = await fetchLogs();

    expect(logs.length).toEqual(5);
    expect(logs).toEqual(expect.arrayContaining(samples));
  });
});

describe("fetchIncidentLogs", () => {
  beforeEach(async () => {
    await db.delete(incidents);
  });
  it("returns empty array incidentId is not found", async () => {
    const logs = await fetchIncidentLogs(randomUUID());

    expect(logs.length).toEqual(0);
  });
  it("returns all the logs belonging to an incidentId", async () => {
    const incidentA = await createIncident({
      title: "Deployment failure",
      service: "deploy-service",
      severity: "high",
      description: "Test incident",
    });
    const incidentB = await createIncident({
      title: "Deployment failure",
      service: "deploy-service",
      severity: "high",
      description: "Test incident",
    });

    const logA: LogEntry = {
      incidentId: incidentA.id,
      timestamp: "2026-10-21T10:00:00.000Z",
      service: "checkout-service",
      level: "error",
      message: "Checkout requests failing",
    };

    const logB: LogEntry = {
      incidentId: incidentB.id,
      timestamp: "2026-10-21T11:00:00.000Z",
      service: "payment-service",
      level: "error",
      message: "Payment requests failing",
    };

    await addLogEntry(logA);
    await addLogEntry(logB);

    const aLogs = await fetchIncidentLogs(incidentA.id);
    const bLogs = await fetchIncidentLogs(incidentB.id);
    expect(aLogs).toEqual([logA]);
    expect(bLogs).toEqual([logB]);
  });
});
