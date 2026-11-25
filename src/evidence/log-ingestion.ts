import { batchInsertLogs } from "./evidence-store.js";
import { parseJsonL, type ImportedLog } from "./log-import.js";
import { getIncident } from "../incidents/incident-store.js";
import { parseTextLog } from "./text-log-import.js";

/**
 * Parse an uploaded log file, choosing the parser from the first non-empty
 * line: JSON objects (JSONL / Pino) or timestamped text. Lines without their
 * own service name get `defaultService`. Throws LogImportError on bad input.
 */
export function parseLogContent(
  content: string,
  defaultService: string,
): ImportedLog[] {
  const firstLine = content
    .split(/\r?\n/)
    .find((line) => line.trim())
    ?.trimStart();

  if (!firstLine) {
    return [];
  }

  return firstLine.startsWith("{")
    ? parseJsonL(content, defaultService)
    : parseTextLog(content, defaultService);
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
