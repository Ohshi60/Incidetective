import type { LogEntry } from "../../../shared/types/evidence.js";
import type { Incident } from "../../../shared/types/incident.js";
import type { InvestigationReport } from "../../../shared/types/report.js";
import { analyseIncident } from "../incident-analysis.js";
import { normalizeErrorMessage } from "../normalize-error.js";

export function generateReport(
  incident: Incident,
  logs: LogEntry[],
): InvestigationReport {
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
  const topGroup = analysis.errorGroups[0];

  const summary = topGroup
    ? `${analysis.errorCount} errors found across ${analysis.totalLogs} logs. ` +
      `The most frequent failure was "${topGroup.normalizedMessage}" ` +
      `in ${topGroup.service}, occurring ${topGroup.count} times. ` +
      `Root cause has not been determined.`
    : `No errors found across ${analysis.totalLogs} logs. ` +
      `Root cause has not been determined.`;

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
