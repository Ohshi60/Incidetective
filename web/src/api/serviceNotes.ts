export interface ServiceNotes {
  service: string;
  notes: string;
}

const url = (service: string) =>
  `/api/services/${encodeURIComponent(service)}/notes`;

export async function fetchServiceNotes(
  service: string,
): Promise<ServiceNotes> {
  const response = await fetch(url(service));

  if (!response.ok) {
    throw new Error("Failed to load setup notes");
  }

  return response.json();
}

export async function saveServiceNotes(
  service: string,
  notes: string,
): Promise<ServiceNotes> {
  const response = await fetch(url(service), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });

  if (!response.ok) {
    throw new Error(`Saving setup notes failed: ${response.status}`);
  }

  return response.json();
}
