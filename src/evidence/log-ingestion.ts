import { batchInsertLogs } from "./evidence-store.js";
import { parseJsonL } from "./log-import.js";
import { getIncident } from "../incidents/incident-store.js";
import { parseTextLog } from "./text-log-import.js";

export async function ingestLogs(
  incidentId: string,
  content: string,
): Promise<number> {
  const incident = await getIncident(incidentId);

  if (!incident) {
    throw new Error("Incident not found");
  }

  const firstLine = content
    .split(/\r?\n/)
    .find((line) => line.trim())
    ?.trimStart();

  if (!firstLine) {
    return 0;
  }

  const parsedLogs = firstLine.startsWith("{")
    ? parseJsonL(content, incident.service)
    : parseTextLog(content, incident.service);
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
