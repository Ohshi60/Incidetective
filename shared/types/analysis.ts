import type { LogEntry } from "./evidence.js";

/**
 * Recurring messages clustered into one pattern. "info" groups only contain
 * info lines that mention failure words (see isNotableInfo).
 */
export interface LogGroup {
  level: "error" | "warn" | "info";
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
  errorGroups: LogGroup[];
  warningGroups: LogGroup[];
  /** Info-level lines mentioning failure words, e.g. "unusable node". */
  notableInfoGroups: LogGroup[];
}

export interface AIInvestigation {
  summary: string;
  /** Evidence the model judged misleading, with its reason. */
  ruledOut: {
    evidenceIds: string[];
    reason: string;
  }[];
  hypotheses: {
    cause: string;
    evidenceIds: string[];
    nextStep: string;
  }[];
  contextEvidence: {
    id: string;
    timestamp: string;
    service: string;
    level: LogEntry["level"];
    message: string;
  }[];
  missingEvidence: string[];
  diagnosticEvidence: {
    id: string;
    fileName: string;
    excerpt: string;
  }[];
}
