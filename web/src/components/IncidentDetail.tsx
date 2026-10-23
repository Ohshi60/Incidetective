import { ReportFindings } from "./ReportFindings";
import type { Incident } from "../../../shared/types/incident";
import { fetchReport } from "../api/reports";
import { useQuery } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { ArrowArcLeftIcon } from "@phosphor-icons/react";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { LogUpload } from "./LogUpload";

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
        <LogUpload incidentId={incident.id} />
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
    </>
  );
}
