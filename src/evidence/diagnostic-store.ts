import { eq, asc } from "drizzle-orm";
import { db } from "../db/client.js";
import { diagnosticEvidence } from "../db/schema.js";

export type DiagnosticEvidence = typeof diagnosticEvidence.$inferSelect;

export async function addDiagnosticEvidence(
  incidentId: string,
  fileName: string,
  content: string,
): Promise<DiagnosticEvidence> {
  const [saved] = await db
    .insert(diagnosticEvidence)
    .values({
      incidentId,
      fileName,
      content,
    })
    .returning();

  if (!saved) {
    throw new Error("Failed to save diagnostic evidence");
  }

  return saved;
}

export async function fetchDiagnosticEvidence(
  incidentId: string,
): Promise<DiagnosticEvidence[]> {
  return db
    .select()
    .from(diagnosticEvidence)
    .where(eq(diagnosticEvidence.incidentId, incidentId))
    .orderBy(asc(diagnosticEvidence.createdAt));
}
