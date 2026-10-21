export interface LogEntry {
  incidentId: string;
  timestamp: string;
  service: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
}
