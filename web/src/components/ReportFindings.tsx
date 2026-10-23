import type { ReportFinding } from "../../../shared/types/report";
import { Badge } from "./ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
interface ReportFindingProps {
  findings: ReportFinding[];
}

export function ReportFindings({ findings }: ReportFindingProps) {
  return (
    <section className="space-y-6">
      {findings.map((finding) => (
        <Card key={`${finding.service}-${finding.pattern}`}>
          <CardHeader className="gap-4">
            <CardDescription>{finding.service}</CardDescription>
            <CardTitle>{finding.pattern}</CardTitle>
            <CardAction>
              <Badge variant="secondary">
                {finding.occurrences} occurrences
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap justify-between gap-3 text-sm text-muted-foreground">
              <p>
                First Seen {new Date(finding.firstSeen).toLocaleTimeString()}
              </p>
              <p>Last Seen {new Date(finding.lastSeen).toLocaleTimeString()}</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Supporting evidence</h4>
              <div className="rounded-lg border bg-background p-4">
                {finding.evidence.map((ev, index) => (
                  <div
                    key={`${ev.timestamp}-${index}`}
                    className="grid grid-cols-[auto_1fr] gap-4 py-2 font-mono text-xs"
                  >
                    <time className="whitespace-nowrap text-muted-foreground">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </time>
                    <span className="break-words">{ev.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
