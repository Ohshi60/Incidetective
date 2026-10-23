import type { InvestigationReport } from "../../../shared/types/report";

export async function fetchReport(
  incidentId: string,
): Promise<InvestigationReport> {
  const response = await fetch(`/api/incidents/${incidentId}/report`);
  if (!response.ok) {
    throw new Error(`Failed to fetch report: ${response.status}`);
  }
  return response.json();
}
