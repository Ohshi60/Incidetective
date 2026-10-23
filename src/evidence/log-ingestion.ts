import { log } from "node:console";
import type { LogEntry } from "../../shared/types/evidence.js";
import { addLogEntry } from "./evidence-store.js";
import { parseJsonL } from "./log-import.js";

export function ingestLogs(incidentId: string, content: string): LogEntry[] {
  const parsedLogs = parseJsonL(content);

  const importedLogs = parsedLogs.map((log) =>
    addLogEntry({ ...log, incidentId }),
  );
  return importedLogs;
}
