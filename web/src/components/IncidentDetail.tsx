import { useEffect, useState } from "react";
import type { Incident } from "../types/incident";
import type { InvestigationReport } from "../types/report";
import { ReportFindings } from "./ReportFindings";

interface IncidentDetailProps {
  incident: Incident;
  onBack: () => void;
}

export function IncidentDetail({ incident, onBack }: IncidentDetailProps) {
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchReport() {
      setLoading(true);
      setError(null);
      setReport(null);
      try {
        const response = await fetch(`/api/incidents/${incident.id}/report`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch report: ${response.status}`);
        }
        const data: InvestigationReport = await response.json();

        if (!controller.signal.aborted) {
          setReport(data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error instanceof Error ? error.message : "Unknown error");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }
    fetchReport();

    return () => controller.abort();
  }, [incident.id]);
  return (
    <div>
      <div className="max-w-sm w-full">
        <div className="font-bold text-xl mb-2">{incident.title}</div>
        <p className="text-gray-700 text-base">{incident.description}</p>
        <div className="px-6 pt-4 pb-2">
          <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">
            Service: {incident.service}
          </span>
          <span className="inline-block bg-red-400 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">
            Severity: {incident.severity}
          </span>
        </div>
        <button
          onClick={() => {
            onBack();
          }}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full"
        >
          Back
        </button>
      </div>
      <div>
        {loading && <p>Loading investigation report...</p>}
        {error && <p className="text-red-400">{error}</p>}

        {report && (
          <section className="mt-8 space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Investigation summary</h2>
              <p className="mt-2 text-slate-300">{report.summary}</p>
            </div>

            <ReportFindings findings={report.findings} />
          </section>
        )}
      </div>
    </div>
  );
}
