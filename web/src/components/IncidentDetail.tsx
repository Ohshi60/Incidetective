import { ReportFindings } from "./ReportFindings";
import type { Incident } from "../../../shared/types/incident";
import { fetchReport } from "../api/reports";
import { useQuery } from "@tanstack/react-query";

interface IncidentDetailProps {
  incident: Incident;
  onBack: () => void;
}

export function IncidentDetail({ incident, onBack }: IncidentDetailProps) {
  // const [report, setReport] = useState<InvestigationReport | null>(null);
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);

  const {
    data: report,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["incidents", incident.id, "report"],
    queryFn: () => fetchReport(incident.id),
  });
  return (
    <>
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
          {isPending && (
            <p className="text-slate-400">Loading investigation report...</p>
          )}

          {isError && (
            <p role="alert" className="text-red-400">
              {error.message}
            </p>
          )}
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
    </>
  );
}
