import type { IncidentAnalysis } from "../../shared/types/analysis.js";
import type { LogEntry } from "../../shared/types/evidence.js";
import { groupLogs } from "./error-grouping.js";

export function analyseIncident(logs: LogEntry[]): IncidentAnalysis {
  // shortcircuit if no logs provided
  if (!logs || logs.length === 0) {
    return {
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      affectedServices: [],
      firstTimestamp: null,
      lastTimestamp: null,
      errorGroups: [],
      warningGroups: [],
      notableInfoGroups: [],
    };
  }

  // Temporary Set to track unique services with O(1) lookups
  const serviceSet = new Set<string>();

  const analysis = logs.reduce<
    Omit<
      IncidentAnalysis,
      "affectedServices" | "errorGroups" | "warningGroups" | "notableInfoGroups"
    >
  >(
    (acc, log) => {
      acc.totalLogs++;

      if (log.level === "error") acc.errorCount++;
      if (log.level === "warn") acc.warningCount++;

      serviceSet.add(log.service);

      if (!acc.firstTimestamp || log.timestamp < acc.firstTimestamp) {
        acc.firstTimestamp = log.timestamp;
      }
      // 5. Determine latest timestamp
      if (!acc.lastTimestamp || log.timestamp > acc.lastTimestamp) {
        acc.lastTimestamp = log.timestamp;
      }
      return acc;
    },
    {
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      firstTimestamp: null,
      lastTimestamp: null,
    },
  );
  return {
    ...analysis,
    affectedServices: Array.from(serviceSet).sort((a, b) => a.localeCompare(b)),
    errorGroups: groupLogs(logs, "error"),
    warningGroups: groupLogs(logs, "warn"),
    notableInfoGroups: groupLogs(logs, "info"),
  };
}
