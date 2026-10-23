import { eq } from "drizzle-orm";
import type {
  CreateIncidentInput,
  Incident,
} from "../../shared/types/incident.js";
import { db } from "../db/client.js";
import { incidents } from "../db/schema.js";

function toIncident(row: typeof incidents.$inferSelect): Incident {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export async function createIncident(
  input: CreateIncidentInput,
): Promise<Incident> {
  const [incident] = await db.insert(incidents).values(input).returning();

  if (!incident) {
    throw new Error("Failed to create incident");
  }
  return toIncident(incident);
}

export async function getIncident(id: string): Promise<Incident | undefined> {
  const [incident] = await db
    .select()
    .from(incidents)
    .where(eq(incidents.id, id));
  if (!incident) {
    return undefined;
  }
  return toIncident(incident);
}

export async function listIncidents(): Promise<Incident[]> {
  const rows = await db.select().from(incidents);

  return rows.map(toIncident);
}
