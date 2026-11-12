import { ReportFindings } from "./ReportFindings";
import type { Incident } from "../../../shared/types/incident";
import { fetchReport } from "../api/reports";
import { useQuery } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { ArrowArcLeftIcon } from "@phosphor-icons/react";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { LogExplorer } from "./LogExplorer";
import { AIInvestigation } from "./AIInvestigation";
import { useState } from "react";
import { EvidenceUpload } from "./EvidenceUpload";

interface IncidentDetailProps {
  incident: Incident;
  onBack: () => void;
}

export function IncidentDetail({ incident, onBack }: IncidentDetailProps) {
  const [evidenceVersion, setEvidenceVersion] = useState(0);

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
    <div className="space-y-6">
      {/* Incident header */}
      <header className="space-y-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowArcLeftIcon className="size-4" />
          All incidents
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="break-words text-xl font-semibold tracking-tight sm:text-2xl">
              {incident.title}
            </h2>
            <p className="text-sm text-muted-foreground">{incident.service}</p>
          </div>
          <Badge variant="outline">{incident.severity}</Badge>
        </div>
      </header>

      {isPending && (
        <p className="text-sm text-muted-foreground">
          Loading investigation...
        </p>
      )}

      {isError && (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}

      {/* Investigation results */}
      {report && (
        <div className="space-y-6">
          {report.findings.length > 0 ? (
            <AIInvestigation
              key={`${incident.id}-${evidenceVersion}`}
              report={report}
            />
          ) : (
            <div className="rounded-lg border border-dashed p-6">
              <h3 className="font-semibold">No error findings yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Import application logs below to begin investigating this
                incident.
              </p>
            </div>
          )}

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

          {report.findings.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">
                Failure patterns ({report.findings.length})
              </h3>
              <ReportFindings findings={report.findings} />
            </section>
          )}
        </div>
      )}

      {/* Evidence uploads */}
      <details
        key={
          report
            ? report.findings.length === 0
              ? "empty"
              : "populated"
            : "loading"
        }
        open={Boolean(report && report.findings.length === 0)}
        className="rounded-xl border"
      >
        <summary className="cursor-pointer p-4 font-medium">
          Add evidence
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            — Logs and diagnostic files
          </span>
        </summary>

        <div className="border-t p-4">
          <EvidenceUpload
            incidentId={incident.id}
            onImported={() => setEvidenceVersion((v) => v + 1)}
          />
        </div>
      </details>

      {/* Raw log exploration */}
      <LogExplorer incidentId={incident.id} />
    </div>
  );
}
