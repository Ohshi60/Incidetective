import type { LogEntry } from "../../shared/types/evidence.js";
import { addLogEntry, fetchIncidentLogs } from "./evidence-store.js";
import { generateLogsForIncident } from "./sample-logs.js";

export async function loadSampleLogsForIncident(
  incidentId: string,
): Promise<LogEntry[]> {
  const logs = await fetchIncidentLogs(incidentId);
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
