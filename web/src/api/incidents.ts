import type { Incident } from "../../../shared/types/incident";

export async function fetchIncidents(): Promise<Incident[]> {
  const response = await fetch("/api/incidents");

  if (!response.ok) {
    throw new Error(`Failed to fetcj incidents: ${response.status}`);
  }
  return response.json();
}
