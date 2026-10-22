import { useEffect, useState } from "react";
import type { Incident } from "./types/incident";
import { CreateIncidentForm } from "./components/CreateIncidentForm";
import { Toaster } from "sonner";
import { IncidentDetail } from "./components/IncidentDetail";

function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  useEffect(() => {
    async function fetchIncidents() {
      try {
        const response = await fetch("/api/incidents");
        if (!response.ok) {
          throw new Error(`HTTP error ${response.json()}`);
        }
        const data: Incident[] = await response.json();
        setIncidents(data);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to fetch incidents",
        );
      } finally {
        setLoading(false);
      }
    }
    fetchIncidents();
  }, []);
  if (loading) return <p>Loading incidents...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <>
      <Toaster position="top-right" theme="dark" richColors />
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
        <div className="mx-auto max-w-4xl space-y-8">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">Incidetective</h1>
            <p className="mt-2 text-slate-400">
              Investigate incidents and explore failure patterns.
            </p>
          </header>
          {incidents.length === 0 ? (
            <p>No incidents found.</p>
          ) : (
            incidents.map((incident) => (
              <div key={incident.id}>
                <h2>{incident.title}</h2>
                <p>{incident.service}</p>
                <p>{incident.severity}</p>
                <button
                  type="button"
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-500"
                  onClick={() => setSelectedIncident(incident)}
                >
                  {incident.title}
                </button>
              </div>
            ))
          )}
          {selectedIncident && (
            <IncidentDetail
              incident={selectedIncident}
              onBack={() => {
                setSelectedIncident(null);
              }}
            />
          )}

          <section className="max-w-xl rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-6 text-xl font-semibold">Create incident</h2>
            <CreateIncidentForm
              onCreated={(incident) => {
                setIncidents((current) => [...current, incident]);
              }}
            />
          </section>
        </div>
      </main>
    </>
  );
}

export default App;
