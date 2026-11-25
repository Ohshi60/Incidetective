import { describe, expect, it } from "vitest";
import { generateReport } from "../src/analysis/reports/generate-report.js";
import { headline } from "../shared/text.js";
import type { LogEntry } from "../shared/types/evidence.js";
import type { Incident } from "../shared/types/incident.js";

const incident: Incident = {
  id: "incident-1",
  title: "Job stopped",
  service: "hadoop",
  severity: "high",
  description: "d",
  createdAt: "2026-10-22T09:00:00Z",
};

const log = (
  level: LogEntry["level"],
  message: string,
  second = 0,
): LogEntry => ({
  incidentId: "incident-1",
  timestamp: new Date(Date.UTC(2026, 9, 22, 10, 0, second)).toISOString(),
  service: "hadoop",
  level,
  message,
});

const stackTrace =
  "[RMCommunicator Allocator] RMContainerAllocator: ERROR IN CONTACTING RM. java.io.IOException: Failed on local exception\n" +
  "\tat org.apache.hadoop.net.NetUtils.wrapException(NetUtils.java:772)\n".repeat(
    40,
  );

describe("headline", () => {
  it("keeps short patterns as they are", () => {
    expect(headline("Connection timeout")).toBe("Connection timeout");
  });

  it("cuts long patterns at a word and collapses whitespace", () => {
    const short = headline(stackTrace);

    expect(short.length).toBeLessThanOrEqual(161);
    expect(short.endsWith("…")).toBe(true);
    expect(short).not.toContain("\n");
    expect(short.startsWith("[RMCommunicator Allocator]")).toBe(true);
    // Cut at a space, not mid-word.
    expect(short.slice(0, -1)).toBe(short.slice(0, -1).trimEnd());
    expect(stackTrace.replace(/\s+/g, " ")).toContain(short.slice(0, -1));
  });
});

describe("report summary", () => {
  it("quotes a stack-trace pattern briefly", () => {
    const report = generateReport(incident, [
      log("error", stackTrace, 1),
      log("error", stackTrace, 2),
    ]);

    expect(report.summary).toMatch(
      /^2 errors found across 2 logs\. The most frequent failure was "\[RMCommunicator Allocator\] .+…" in hadoop, occurring 2 times\. Root cause has not been determined\.$/,
    );
    expect(report.summary.length).toBeLessThan(300);
  });

  it("names the most frequent warning when there are no errors", () => {
    const report = generateReport(incident, [
      log("warn", "Failed to connect to /10.0.0.1:50010 for block", 1),
      log("warn", "Failed to connect to /10.0.0.2:50010 for block", 2),
      log("info", "Started", 0),
    ]);

    expect(report.summary).toBe(
      'No errors found across 3 logs, but 2 warnings. The most frequent warning was "Failed to connect to /<IP>:<NUM> for block" in hadoop, occurring 2 times. Root cause has not been determined.',
    );
  });

  it("says when there are no errors or warnings", () => {
    expect(generateReport(incident, [log("info", "Started")]).summary).toBe(
      "No errors found across 1 logs. Root cause has not been determined.",
    );
  });
});
