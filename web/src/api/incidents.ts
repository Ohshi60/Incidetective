import type {
  CreateIncidentInput,
  Incident,
} from "../../../shared/types/incident";

export async function fetchIncidents(): Promise<Incident[]> {
  const response = await fetch("/api/incidents");

  if (!response.ok) {
    throw new Error(`Failed to fetcj incidents: ${response.status}`);
  }
  return response.json();
}

export async function createIncident(
  input: CreateIncidentInput,
): Promise<Incident> {
  const response = await fetch("/api/incidents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetcj incidents: ${response.status}`);
  }
  return response.json();
}
