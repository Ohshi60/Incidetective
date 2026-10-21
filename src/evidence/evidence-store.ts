import type { LogEntry } from "./evidence.js";

const logEntries: LogEntry[] = [];

export function addLogEntry(entry: LogEntry): LogEntry {
  logEntries.push(entry);
  return entry;
}

export function fetchLogs(): LogEntry[] {
  return logEntries;
}

export function clearLog(): void {
  logEntries.length = 0;
}
