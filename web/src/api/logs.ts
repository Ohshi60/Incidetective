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
