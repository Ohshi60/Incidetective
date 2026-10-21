import { beforeEach, describe, expect, it } from "vitest";
import {
  createIncident,
  getIncident,
  listIncidents,
} from "../src/incidents/incident-store.js";
import { getSampleLogs } from "../src/evidence/sample-logs.js";
import {
  addLogEntry,
  clearLog,
  fetchLogs,
} from "../src/evidence/evidence-store.js";

describe("addLog", () => {
  beforeEach(() => {
    clearLog();
  });
  it("adds the log to the db", () => {
    const [first, ...samples] = getSampleLogs();
    if (!first) {
      return;
    }
    const entry = addLogEntry(first);

    expect(entry.message).toBe(first.message);
    expect(entry.service).toBe(first.service);
    expect(entry.level).toBe(first.level);
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
