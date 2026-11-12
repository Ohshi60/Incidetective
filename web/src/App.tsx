import { useState } from "react";
import type { Incident } from "../../shared/types/incident";
import { Toaster } from "sonner";
import { IncidentDetail } from "./components/IncidentDetail";
import { useQuery } from "@tanstack/react-query";
import { fetchIncidents } from "./api/incidents";
import { IncidentCard } from "./components/IncidentCard";
import { CreateIncidentDialog } from "./components/CreateIncidentDialog";
import { Input } from "./components/ui/input";

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
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();

  const visibleIncidents = incidents
    .filter((incident) =>
      [incident.title, incident.service, incident.description].some((value) =>
        value.toLowerCase().includes(query),
      ),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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

    if (incidents.length === 0) {
      return (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h3 className="font-medium">No incidents yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create an incident to start investigating application failures.
          </p>
        </div>
      );
    }

    if (visibleIncidents.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No incidents match your search.
        </p>
      );
    }

    return visibleIncidents.map((incident) => (
      <IncidentCard
        key={incident.id}
        incident={incident}
        onSelect={setSelectedIncident}
      />
    ));
  }

  return (
    <>
      <Toaster position="top-right" theme="dark" richColors />

      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10">
          {" "}
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
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                {" "}
                <div>
                  <h2 className="text-2xl font-semibold">Incidents</h2>
                  <p className="text-sm text-muted-foreground">
                    Investigate service failures
                  </p>
                </div>
                <CreateIncidentDialog />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                  type="search"
                  placeholder="Search incidents or services..."
                  aria-label="Search incidents"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="sm:max-w-sm"
                />

                <span className="text-sm text-muted-foreground">
                  {visibleIncidents.length} of {incidents.length} incidents
                </span>
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
