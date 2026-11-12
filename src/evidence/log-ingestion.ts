import { batchInsertLogs } from "./evidence-store.js";
import { parseJsonL } from "./log-import.js";
import { getIncident } from "../incidents/incident-store.js";

export async function ingestLogs(
  incidentId: string,
  content: string,
): Promise<number> {
  const incident = await getIncident(incidentId);

  if (!incident) {
    throw new Error("Incident not found");
  }

  const parsedLogs = parseJsonL(content, incident.service);

  if (parsedLogs.length === 0) {
    return 0;
  }

  const importedLogs = parsedLogs.map((log) => ({
    ...log,
    incidentId,
  }));

  await batchInsertLogs(importedLogs);

  return importedLogs.length;
}
