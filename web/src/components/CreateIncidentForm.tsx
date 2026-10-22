import { useState, type SubmitEvent } from "react";
import type { Incident } from "../types/incident";
import { toast } from "sonner";

interface CreateIncidentFormProps {
  onCreated: (incident: Incident) => void;
}

export function CreateIncidentForm({ onCreated }: CreateIncidentFormProps) {
  const [title, setTitle] = useState<string>("");
  const [service, setService] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [severity, setSeverity] = useState<
    "low" | "medium" | "high" | "critical"
  >("medium");
  const [description, setDescription] = useState("");

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSubmitting(true);
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          service,
          severity,
          description,
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to create incident: ${response.status}`);
      }
      const createdIncident: Incident = await response.json();
      onCreated(createdIncident);

      toast.success("Incident created successfully");

      setTitle("");
      setService("");
      setSeverity("medium");
      setDescription("");
      setSubmitting(false);
    } catch (error) {
      console.error("Error creating incident:", error);
      toast.error("Failed to create incident");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="title" className="block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          className="w-full rounded-md border border-slate-500 bg-slate-900 p-2 text-white"
        />
      </div>
      <div>
        <label htmlFor="service">Service</label>
        <input
          id="service"
          type="text"
          value={service}
          onChange={(e) => setService(e.target.value)}
          required
          className="w-full rounded-md border border-slate-500 bg-slate-900 p-2 text-white"
        />
      </div>
      <div>
        <label htmlFor="severity" className="block text-sm font-medium">
          Severity
        </label>
        <select
          id="severity"
          value={severity}
          onChange={(e) =>
            setSeverity(
              e.target.value as "low" | "medium" | "high" | "critical",
            )
          }
          required
          className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-white"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-white"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-500"
      >
        Create incident
      </button>
    </form>
  );
}
