import { batchInsertLogs } from "./evidence-store.js";
import type { ImportedLog } from "./log-import.js";
import { parseLogs } from "./log-parser.js";
import { getIncident } from "../incidents/incident-store.js";

/**
 * Parse an uploaded log file in any supported format (see log-parser.ts).
 * Lines without their own service name get `defaultService`. Throws
 * LogImportError when nothing in the file can be read as a log entry.
 */
export function parseLogContent(
  content: string,
  defaultService: string,
): ImportedLog[] {
  return content.trim() ? parseLogs(content, defaultService) : [];
}

export async function ingestLogs(
  incidentId: string,
  content: string,
): Promise<number> {
  const incident = await getIncident(incidentId);

  if (!incident) {
    throw new Error("Incident not found");
  }

  const parsedLogs = parseLogContent(content, incident.service);
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
