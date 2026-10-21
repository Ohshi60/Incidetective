export interface LogEntry {
  timestamp: string;
  service: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
}
