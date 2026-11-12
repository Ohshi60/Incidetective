import { useMutation } from "@tanstack/react-query";
import type { InvestigationReport } from "../../../shared/types/report";
import type { AIInvestigation as AIResult } from "../../.../shared/types/analysis";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface Props {
  report: InvestigationReport;
}

export function AIInvestigation({ report }: Props) {
  const investigation = useMutation({
    mutationFn: async (): Promise<AIResult> => {
      const response = await fetch(
        `/api/incidents/${report.incidentId}/ai-investigation`,
        { method: "POST" },
      );

      if (!response.ok) {
        throw new Error(`Ai request failed: ${response.status}`);
      }

      return response.json();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Investigation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          disabled={investigation.isPending || report.findings.length === 0}
          onClick={() => investigation.mutate()}
        >
          {investigation.isPending
            ? "Analysing evidence"
            : "Investigate with AI"}
        </Button>
        {investigation.isError && (
          <p role="alert" className="text-sm text-destructive">
            {investigation.error.message}
          </p>
        )}

        {investigation.data && (
          <div className="space-y-4">
            <p className="text-sm">{investigation.data.summary}</p>
            {investigation.data.hypotheses.map((h, index) => (
              <div key={index} className="space-y-2 rounded-lg border p-4">
                <h4 className="font-semibold">Hypothesis {index + 1}</h4>
                <p className="text-sm">{h.cause}</p>
                <div className="text-xs text-muted-foreground">
                  Evidence:{" "}
                  {h.evidenceIds
                    .map((id) => {
                      const findingIndex = Number(id.slice(1)) - 1;
                      const finding = report.findings[findingIndex];
                      return finding
                        ? `${id} (${finding.service}: ${finding.pattern})`
                        : id;
                    })
                    .join(", ") || "No supporting finding cited"}
                </div>
                <p className="text-sm">
                  <strong>Next step:</strong> {h.nextStep}
                </p>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              AI-generated hypotheses. Verify before acting.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
