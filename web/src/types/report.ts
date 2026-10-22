export interface ReportFinding {
  service: string;
  pattern: string;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  evidence: {
    timestamp: string;
    message: string;
  }[];
}

export interface InvestigationReport {
  incidentId: string;
  title: string;
  service: string;
  severity: IncidentSeverity;
  generatedAt: string;
  summary: string;
  findings: ReportFinding[];
}

export type IncidentSeverity = "low" | "medium" | "high" | "critical";
