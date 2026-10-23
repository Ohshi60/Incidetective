import type { LogEntry } from "./evidence.js";

export interface ErrorGroup {
  service: string;
  normalizedMessage: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  evidence: LogEntry[];
}

export interface IncidentAnalysis {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  affectedServices: string[];
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  errorGroups: ErrorGroup[];
}
