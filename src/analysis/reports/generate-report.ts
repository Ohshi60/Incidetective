import type { LogEntry } from "../../evidence/evidence.js";
import type { Incident } from "../../incidents/incident.js";
import { analyseIncident } from "../incident-analysis.js";
import { normalizeErrorMessage } from "../normalize-error.js";
import type { InvestigationReport } from "./investigation-report.js";

export function generateReport(
  incident: Incident,
  logs: LogEntry[],
): InvestigationReport {
  // Your implementation

  const analysis = analyseIncident(logs);
  const findings = analysis.errorGroups.map((group) => {
    const evidence = logs
      .filter(
        (log) =>
          log.level === "error" &&
          log.service === group.service &&
          normalizeErrorMessage(log.message) === group.normalizedMessage,
      )
      .sort((a, b) => {
        return a.timestamp.localeCompare(b.timestamp);
      })
      .slice(0, 3)
      .map((log) => ({
        timestamp: log.timestamp,
        message: log.message,
      }));

    return {
      service: group.service,
      pattern: group.normalizedMessage,
      occurrences: group.count,
      firstSeen: group.firstSeen,
      lastSeen: group.lastSeen,
      evidence,
    };
  });
  let summary;
  if (analysis.errorCount) {
    summary =
      `
    ${analysis.errorCount} errors found across ${analysis.totalLogs}
    ` +
      `The most frequent failure was ${analysis.errorGroups[0]?.normalizedMessage}` +
      `in ${analysis.errorGroups[0]?.service}, occuring ${analysis.errorGroups[0]?.count} times` +
      "root cause has not been determined";
  } else {
    summary = `No errors found across ${analysis.totalLogs}
    root cause has not been determined`;
  }

  return {
    incidentId: incident.id,
    title: incident.title,
    service: incident.service,
    severity: incident.severity,
    generatedAt: new Date().toISOString(),
    summary,
    findings,
  };
}
