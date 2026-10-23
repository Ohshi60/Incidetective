import type { Incident } from "../../../shared/types/incident";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "./ui/badge";

interface IncidentCardProps {
  incident: Incident;
  onSelect: (incident: Incident) => void;
}

export function IncidentCard({ incident, onSelect }: IncidentCardProps) {
  const severityClasses = {
    low: "bg-slate-500/10 text-slate-400",
    medium: "bg-blue-500/10 text-blue-400",
    high: "bg-orange-500/10 text-orange-400",
    critical: "bg-red-500/10 text-red-400",
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(incident)}
      className="group block w-full cursor-pointer rounded-xl text-left focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Card className="gap-2 py-4 transition-colors group-hover:border-primary/50 group-hover:bg-accent/30">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {incident.title}
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className={severityClasses[incident.severity]}
            >
              {incident.severity}
            </Badge>
          </CardAction>
          <CardDescription className="text-sm text-muted-foreground">
            {incident.service}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>{incident.description}</p>
        </CardContent>
      </Card>
    </button>
  );
}
