import type { LogEntry } from "../../../shared/types/evidence";

export async function importLogs(
  incidentId: string,
  file: File,
): Promise<{ imported: number }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/incidents/${incidentId}/logs/import`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to import logs: ${response.status}`);
  }
  return response.json();
}

export async function fetchIncidentLogs(
  incidentId: string,
): Promise<LogEntry[]> {
  const response = await fetch(`/api/incidents/${incidentId}/logs`);
  if (!response.ok) {
    throw new Error("Failed to fetch incident logs");
  }

  return response.json();
}
