import { addLogEntry, fetchIncidentLogs } from "./evidence-store.js";
import { generateLogsForIncident } from "./sample-logs.js";

export function loadSampleLogsForIncident(incidentId: string): LogEntry[] {
  // Your implementation
  const logs = fetchIncidentLogs(incidentId);
  if (logs) {
    return logs;
  } else {
    const generatedLogs = generateLogsForIncident(incidentId);
    generatedLogs.map((log) => {
      addLogEntry(log);
    });
    return generatedLogs;
  }
}
