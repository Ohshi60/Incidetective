import { eq, asc } from "drizzle-orm";
import type { LogEntry } from "../../shared/types/evidence.js";
import { db } from "../db/client.js";
import { logs } from "../db/schema.js";

function toLogEntry(row: typeof logs.$inferSelect): LogEntry {
  return {
    incidentId: row.incidentId,
    timestamp: new Date(row.timestamp).toISOString(),
    service: row.service,
    level: row.level,
    message: row.message,
  };
}

export async function addLogEntry(entry: LogEntry): Promise<LogEntry> {
  const [result] = await db.insert(logs).values(entry).returning();
  if (!result) {
    throw new Error("failed to create log entry");
  }
  return toLogEntry(result);
}

export async function fetchLogs(): Promise<LogEntry[]> {
  const result = await db.select().from(logs);
  return result.map(toLogEntry);
}

export async function fetchIncidentLogs(
  incidentId: string,
): Promise<LogEntry[]> {
  const result = await db
    .select()
    .from(logs)
    .where(eq(logs.incidentId, incidentId))
    .orderBy(asc(logs.timestamp));

  return result.map(toLogEntry);
}

// PostgreSQL allows at most 65,535 bind parameters per statement, and each
// row uses 5, so large files are inserted in chunks.
const INSERT_CHUNK_ROWS = 1000;

/** Insert all entries, or none if any chunk fails. */
export async function batchInsertLogs(logArray: LogEntry[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < logArray.length; i += INSERT_CHUNK_ROWS) {
      await tx.insert(logs).values(logArray.slice(i, i + INSERT_CHUNK_ROWS));
    }
  });
}
