import { useState, type SubmitEvent } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createIncident } from "../api/incidents";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";

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
      title: title.trim(),
      service: service.trim(),
      severity,
      description: description.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g Checkout API returning 500 errors"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="service">Service</Label>
        <Input
          id="service"
          value={service}
          onChange={(event) => setService(event.target.value)}
          placeholder="the service logging the error"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="severity">Severity</Label>
        <Select
          value={severity}
          onValueChange={(value) => {
            if (value) {
              setSeverity(value);
            }
          }}
          items={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
            { value: "critical", label: "Critical" },
          ]}
        >
          <SelectTrigger id="severity" className="w-full">
            <SelectValue placeholder="select severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what happened"
          rows={4}
          required
        />
        <p className="text-xs text-muted-foreground">
          Describe the symptoms rather than an assumed root cause.
        </p>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Create incident"}
        </Button>
      </div>
    </form>
  );
}
