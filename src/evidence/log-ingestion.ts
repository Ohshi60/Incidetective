import { batchInsertLogs } from "./evidence-store.js";
import { parseJsonL } from "./log-import.js";

export async function ingestLogs(
  incidentId: string,
  content: string,
): Promise<number> {
  const parsedLogs = parseJsonL(content);

  const importedLogs = parsedLogs.map((log) => {
    return { ...log, incidentId };
  });
  if (importedLogs.length === 0) {
    return 0;
  }
  await batchInsertLogs(importedLogs);
  return importedLogs.length;
}
