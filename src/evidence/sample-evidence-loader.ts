import { addLogEntry, fetchIncidentLogs } from "./evidence-store.js";
import type { LogEntry } from "./evidence.js";
import { generateLogsForIncident } from "./sample-logs.js";

export function loadSampleLogsForIncident(incidentId: string): LogEntry[] {
  const logs = fetchIncidentLogs(incidentId);
  if (logs.length) {
    return logs;
  } else {
    const generatedLogs = generateLogsForIncident(incidentId);
    generatedLogs.forEach((log) => {
      addLogEntry(log);
    });
    return generatedLogs;
  }
}
