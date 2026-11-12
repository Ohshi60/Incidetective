import type { ReportFinding } from "../../../shared/types/report";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader } from "./ui/card";

interface ReportFindingProps {
  findings: ReportFinding[];
}

export function ReportFindings({ findings }: ReportFindingProps) {
  return (
    <section className="space-y-3">
      {findings.map((finding) => (
        <Card key={`${finding.service}-${finding.pattern}`} className="gap-0">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {finding.service}
              </span>

              <Badge variant="secondary">
                {finding.occurrences} occurrences
              </Badge>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Error pattern</p>

              <p className="break-all font-mono text-sm font-medium leading-relaxed">
                {finding.pattern}
              </p>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <div>
                <span>First seen: </span>
                <time dateTime={finding.firstSeen}>
                  {new Date(finding.firstSeen).toLocaleString()}
                </time>
              </div>

              <div>
                <span>Last seen: </span>
                <time dateTime={finding.lastSeen}>
                  {new Date(finding.lastSeen).toLocaleString()}
                </time>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <details className="group rounded-lg border">
              <summary className="cursor-pointer select-none p-3 text-sm font-medium hover:bg-muted/30">
                Supporting evidence
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({finding.evidence.length} samples)
                </span>
              </summary>

              <div className="space-y-3 border-t p-3">
                {finding.evidence.map((ev, index) => (
                  <div
                    key={`${ev.timestamp}-${index}`}
                    className="space-y-2 rounded-md bg-muted/40 p-3"
                  >
                    <time
                      dateTime={ev.timestamp}
                      className="block font-mono text-xs text-muted-foreground"
                    >
                      {new Date(ev.timestamp).toLocaleString()}
                    </time>

                    <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">
                      {ev.message}
                    </pre>
                  </div>
                ))}
              </div>
            </details>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
