import type { ReportFinding } from "../../../shared/types/report";
import { headline } from "../../../shared/text";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader } from "./ui/card";

const levelLabels: Record<
  ReportFinding["level"],
  {
    badge: string;
    pattern: string;
    variant: "destructive" | "outline" | "ghost";
  }
> = {
  error: { badge: "Error", pattern: "Error pattern", variant: "destructive" },
  warn: { badge: "Warning", pattern: "Warning pattern", variant: "outline" },
  info: {
    badge: "Notable info",
    pattern: "Info pattern mentioning a failure",
    variant: "ghost",
  },
};

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

              <div className="flex gap-2">
                <Badge variant={levelLabels[finding.level].variant}>
                  {levelLabels[finding.level].badge}
                </Badge>
                <Badge variant="secondary">
                  {finding.occurrences} occurrences
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {levelLabels[finding.level].pattern}
              </p>

              <p className="break-all font-mono text-sm font-medium leading-relaxed">
                {headline(finding.pattern)}
              </p>

              {headline(finding.pattern) !== finding.pattern.trim() && (
                <details className="text-xs">
                  <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">
                    Show full pattern
                  </summary>
                  <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted/40 p-3 font-mono leading-relaxed">
                    {finding.pattern}
                  </pre>
                </details>
              )}
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
