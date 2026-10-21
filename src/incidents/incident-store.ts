import type { Incident, CreateIncidentInput } from "./incident.js";
import { randomUUID } from "node:crypto";

const incidentMap = new Map<string, Incident>();

export function createIncident(input: CreateIncidentInput): Incident {
  const incident: Incident = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  incidentMap.set(incident.id, incident);
  return incident;
}

export function getIncident(id: string): Incident | undefined {
  return incidentMap.get(id);
}

export function listIncidents(): Incident[] {
  return Array.from(incidentMap.values());
}
