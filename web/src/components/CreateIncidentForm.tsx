import { useState, type SubmitEvent } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createIncident } from "../api/incidents";

interface CreateIncidentFormProps {
  onSuccess?: () => void;
}

export function CreateIncidentForm({ onSuccess }: CreateIncidentFormProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      setTitle("");
      setService("");
      setSeverity("medium");
      setDescription("");
      toast.success("Incident created succesfully");
      onSuccess?.();
    },
    onError: () => {
      toast.error("Failed to create incident");
    },
  });
  const [title, setTitle] = useState<string>("");
  const [service, setService] = useState<string>("");
  const [severity, setSeverity] = useState<
    "low" | "medium" | "high" | "critical"
  >("medium");
  const [description, setDescription] = useState("");

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate({
      title,
      service,
      severity,
      description,
    });
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
        disabled={mutation.isPending}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-500"
      >
        {mutation.isPending ? "Creating..." : "Create incident"}
      </button>
    </form>
  );
}
