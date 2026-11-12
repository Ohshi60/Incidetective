export interface DiagnosticFile {
  id: string;
  fileName: string;
  createdAt: string;
}

export async function uploadDiagnostic(
  incidentId: string,
  file: File,
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/incidents/${incidentId}/diagnostics`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Diagnostic upload failed: ${response.status}`);
  }
}

export async function fetchDiagnostics(
  incidentId: string,
): Promise<DiagnosticFile[]> {
  const response = await fetch(`/api/incidents/${incidentId}/diagnostics`);

  if (!response.ok) {
    throw new Error("Failed to fetch diagnostics");
  }

  return response.json();
}
