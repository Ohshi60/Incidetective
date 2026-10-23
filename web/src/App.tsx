import { useState } from "react";
import type { Incident } from "../../shared/types/incident";
import { Toaster } from "sonner";
import { IncidentDetail } from "./components/IncidentDetail";
import { useQuery } from "@tanstack/react-query";
import { fetchIncidents } from "./api/incidents";
import { IncidentCard } from "./components/IncidentCard";
import { CreateIncidentDialog } from "./components/CreateIncidentDialog";

function App() {
  const {
    data: incidents = [],
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["incidents"],
    queryFn: fetchIncidents,
  });
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );

  function renderIncidents() {
    if (isPending) {
      return <p className="text-muted-foreground">Loading incidents...</p>;
    }
    if (isError) {
      return (
        <p role="alert" className="text-destructive">
          {error.message}
        </p>
      );
    }
    return incidents.length === 0 ? (
      <p className="text-muted-foreground">No incidents found</p>
    ) : (
      incidents.map((incident) => (
        <IncidentCard
          key={incident.id}
          incident={incident}
          onSelect={setSelectedIncident}
        />
      ))
    );
  }

  return (
    <>
      <Toaster position="top-right" theme="dark" richColors />

      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-5xl space-y-10 py-10">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Incidetective</h1>
            <p className="text-muted-foreground">
              Investigate incidents and explore failure patterns.
            </p>
          </header>

          {selectedIncident ? (
            <IncidentDetail
              incident={selectedIncident}
              onBack={() => {
                setSelectedIncident(null);
              }}
            />
          ) : (
            <section className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">Incidents</h2>
                  <p className="text-sm text-muted-foreground">
                    Investigate service failures
                  </p>
                </div>
                <CreateIncidentDialog />
              </div>
              {/* Incident list*/}
              <div className="space-y-3">{renderIncidents()}</div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

// <Dialog>
//   <DialogTrigger render={<Button />}>
//     New incident
//   </DialogTrigger>

//   <DialogContent>
//     <DialogHeader>
//       <DialogTitle>Create incident</DialogTitle>
//       <DialogDescription>
//         Create a new incident to begin investigating.
//       </DialogDescription>
//     </DialogHeader>

//     <CreateIncidentForm />
//   </DialogContent>
// </Dialog>

export default App;
