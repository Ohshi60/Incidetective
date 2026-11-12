import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchIncidentLogs } from "../api/logs";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type Props = {
  incidentId: string;
};

export function LogExplorer({ incidentId }: Props) {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [limit, setLimit] = useState(50);

  const {
    data: logs = [],
    isPending,
    isError,
  } = useQuery({
    queryKey: ["incidents", incidentId, "logs"],
    queryFn: () => fetchIncidentLogs(incidentId),
  });

  if (isPending) return <p>Loading logs...</p>;
  if (isError) return <p>Failed to load logs.</p>;

  const query = search.trim().toLowerCase();

  const filteredLogs = logs
    .filter((log) => {
      const matchesLevel = level === "all" || log.level === level;

      const matchesSearch =
        log.message.toLowerCase().includes(query) ||
        log.service.toLowerCase().includes(query);

      return matchesLevel && matchesSearch;
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const visibleLogs = filteredLogs.slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evidence Explorer ({logs.length})</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Search logs or services..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setLimit(50);
            }}
          />

          <select
            aria-label="Filter by log level"
            value={level}
            onChange={(event) => {
              setLevel(event.target.value);
              setLimit(50);
            }}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">All levels</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        <p className="text-xs text-muted-foreground">
          Showing {visibleLogs.length} of {filteredLogs.length} matching logs
        </p>

        <div className="space-y-2">
          {visibleLogs.map((log, index) => (
            <details
              key={`${log.timestamp}-${log.service}-${index}`}
              className="rounded-md border p-3"
            >
              <summary className="cursor-pointer">
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  <span className="font-semibold uppercase">{log.level}</span>
                  <span>{log.service}</span>
                </div>

                <p className="mt-2 truncate font-mono text-xs">
                  {log.message.split("\n")[0]}
                </p>
              </summary>

              <pre className="mt-3 whitespace-pre-wrap break-words rounded bg-muted/50 p-3 text-xs">
                {log.message}
              </pre>
            </details>
          ))}

          {filteredLogs.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No matching logs found.
            </p>
          )}
        </div>

        {filteredLogs.length > limit && (
          <Button
            variant="outline"
            onClick={() => setLimit((current) => current + 50)}
          >
            Show more logs
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
