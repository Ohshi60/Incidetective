import type { LogEntry } from "../evidence/evidence.js";
import { groupErrors, type ErrorGroup } from "./error-grouping.js";

export interface IncidentAnalysis {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  affectedServices: string[];
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  errorGroups: ErrorGroup[];
}

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
    };
  }

  // Temporary Set to track unique services with O(1) lookups
  const serviceSet = new Set<string>();

  const analysis = logs.reduce<
    Omit<IncidentAnalysis, "affectedServices" | "errorGroups">
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
    errorGroups: groupErrors(logs),
  };
}
