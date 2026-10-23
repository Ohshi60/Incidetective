import { ReportFindings } from "./ReportFindings";
import type { Incident } from "../../../shared/types/incident";
import { fetchReport } from "../api/reports";
import { useQuery } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { ArrowArcLeftIcon } from "@phosphor-icons/react";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface IncidentDetailProps {
  incident: Incident;
  onBack: () => void;
}

export function IncidentDetail({ incident, onBack }: IncidentDetailProps) {
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
      <section className="space-y-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowArcLeftIcon className="size-4" />
          All incidents
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {incident.title}
            </h2>
            <p className="text-sm text-muted-foreground">{incident.service}</p>
          </div>
          <Badge variant="outline">{incident.severity}</Badge>
        </div>
      </section>

      <section>
        {isPending && (
          <p className="text-muted-foreground">Loading incidents...</p>
        )}
        {isError && (
          <p role="alert" className="text-destructive">
            {error.message}
          </p>
        )}
        {report && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Investigation summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {report.summary}
                </p>
              </CardContent>
            </Card>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Failure patterns</h3>

              <ReportFindings findings={report.findings} />
            </div>
          </div>
        )}
      </section>
      {/* <div>
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
      </div> */}
    </>
  );
}
