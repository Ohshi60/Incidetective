import type { Incident } from "../../../shared/types/incident";
import { ArrowUpRight, CalendarDays } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "./ui/badge";

interface IncidentCardProps {
  incident: Incident;
  onSelect: (incident: Incident) => void;
}

const severityClasses = {
  low: "border-slate-500/30 bg-slate-500/10 text-slate-400",
  medium: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  high: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  critical: "border-red-500/30 bg-red-500/10 text-red-400",
};

export function IncidentCard({ incident, onSelect }: IncidentCardProps) {
  const createdAt = new Date(incident.createdAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <button
      type="button"
      onClick={() => onSelect(incident)}
      className="group block w-full cursor-pointer rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="gap-0 py-0 transition-colors group-hover:border-primary/50 group-hover:bg-accent/30">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                  {incident.service}
                </span>

                <Badge
                  variant="outline"
                  className={severityClasses[incident.severity]}
                >
                  {incident.severity.toUpperCase()}
                </Badge>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-semibold tracking-tight">
                  {incident.title}
                </h3>

                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {incident.description}
                </p>
              </div>
            </div>

            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          </div>

          <div className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" />
            <time dateTime={incident.createdAt}>Created {createdAt}</time>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
