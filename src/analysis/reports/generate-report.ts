import type { LogEntry } from "../../../shared/types/evidence.js";
import type { Incident } from "../../../shared/types/incident.js";
import type { InvestigationReport } from "../../../shared/types/report.js";
import { analyseIncident } from "../incident-analysis.js";

const HEADLINE_CHARS = 160;

/**
 * A pattern short enough to quote in a sentence. Patterns from Java-style
 * logs include the whole stack trace; keep the start, cut at a word.
 */
export function headline(pattern: string, max = HEADLINE_CHARS): string {
  const text = pattern.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function generateReport(
  incident: Incident,
  logs: LogEntry[],
): InvestigationReport {
  const analysis = analyseIncident(logs);
  // Errors, then warnings, then notable info; each sorted by frequency.
  const groups = [
    ...analysis.errorGroups,
    ...analysis.warningGroups,
    ...analysis.notableInfoGroups,
  ];
  const findings = groups.map((group) => {
    const evidence = [...group.evidence]
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .slice(0, 3)
      .map((log) => ({
        timestamp: log.timestamp,
        message: log.message,
      }));
    return {
      level: group.level,
      service: group.service,
      pattern: group.normalizedMessage,
      occurrences: group.count,
      firstSeen: group.firstSeen,
      lastSeen: group.lastSeen,
      evidence,
    };
  });
  const topError = analysis.errorGroups[0];
  const topWarning = analysis.warningGroups[0];

  const summary = topError
    ? `${analysis.errorCount} errors found across ${analysis.totalLogs} logs. ` +
      `The most frequent failure was "${headline(topError.normalizedMessage)}" ` +
      `in ${topError.service}, occurring ${topError.count} times. ` +
      `Root cause has not been determined.`
    : topWarning
      ? `No errors found across ${analysis.totalLogs} logs, but ${analysis.warningCount} warnings. ` +
        `The most frequent warning was "${headline(topWarning.normalizedMessage)}" ` +
        `in ${topWarning.service}, occurring ${topWarning.count} times. ` +
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
