import type { LogEntry } from "../../shared/types/evidence.js";
import { batchInsertLogs, fetchIncidentLogs } from "./evidence-store.js";
import { generateLogsForIncident } from "./sample-logs.js";

export async function loadSampleLogsForIncident(
  incidentId: string,
): Promise<LogEntry[]> {
  const logs = await fetchIncidentLogs(incidentId);
  if (logs.length) {
    return logs;
  } else {
    const generatedLogs = generateLogsForIncident(incidentId);
    await batchInsertLogs(generatedLogs);
    return generatedLogs;
  }
}
