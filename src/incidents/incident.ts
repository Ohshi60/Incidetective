export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export interface CreateIncidentInput {
  title: string;
  service: string;
  severity: IncidentSeverity;
  description: string;
}

export interface Incident extends CreateIncidentInput {
  id: string;
  createdAt: string;
}
