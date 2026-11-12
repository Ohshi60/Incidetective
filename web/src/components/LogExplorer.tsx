import { useQuery } from "@tanstack/react-query";
import { fetchIncidentLogs } from "../api/logs";

type Props = {
  incidentId: string;
};

export function LogExplorer({ incidentId }: Props) {
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

  return (
    <div>
      <h2>Evidence Explorer ({logs.length})</h2>
      {/* Table goes here next */}
    </div>
  );
}
