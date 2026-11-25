import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { serviceNotes } from "../db/schema.js";

/** Longest setup note accepted; they go into every investigation prompt. */
export const MAX_SERVICE_NOTES_CHARS = 2000;

export async function getServiceNotes(service: string): Promise<string> {
  const [row] = await db
    .select({ notes: serviceNotes.notes })
    .from(serviceNotes)
    .where(eq(serviceNotes.service, service));
  return row?.notes ?? "";
}

/** Save the notes for a service; empty notes remove them. */
export async function setServiceNotes(
  service: string,
  notes: string,
): Promise<void> {
  if (!notes.trim()) {
    await db.delete(serviceNotes).where(eq(serviceNotes.service, service));
    return;
  }
  await db
    .insert(serviceNotes)
    .values({ service, notes })
    .onConflictDoUpdate({
      target: serviceNotes.service,
      set: { notes, updatedAt: sql`now()` },
    });
}
