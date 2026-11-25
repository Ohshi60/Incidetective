import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { fetchServiceNotes, saveServiceNotes } from "@/api/serviceNotes";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

/** Matches MAX_SERVICE_NOTES_CHARS in the API. */
const MAX_CHARS = 2000;

interface ServiceNotesProps {
  service: string;
}

/**
 * Facts about a service's setup that the AI gets with every investigation
 * of that service: versions, hardware, what is normal.
 */
export function ServiceNotes({ service }: ServiceNotesProps) {
  const notes = useQuery({
    queryKey: ["services", service, "notes"],
    queryFn: () => fetchServiceNotes(service),
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        What you know about how <strong>{service}</strong> is set up: versions,
        hardware, which messages are normal. The AI gets these with every
        investigation of this service, so it can recognize routine messages and
        suggest steps that fit your setup.
      </p>

      {notes.isPending && (
        <p className="text-sm text-muted-foreground">Loading notes...</p>
      )}
      {notes.isError && (
        <p role="alert" className="text-sm text-destructive">
          {notes.error.message}
        </p>
      )}
      {notes.data && (
        // Remount with the saved text whenever it changes.
        <NotesEditor
          key={notes.data.notes}
          service={service}
          saved={notes.data.notes}
        />
      )}
    </div>
  );
}

function NotesEditor({ service, saved }: { service: string; saved: string }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(saved);

  const save = useMutation({
    mutationFn: () => saveServiceNotes(service, draft),
    onSuccess: (result) => {
      queryClient.setQueryData(["services", service, "notes"], result);
      toast.success("Setup notes saved");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <>
      <Textarea
        aria-label={`Setup notes for ${service}`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={MAX_CHARS}
        rows={5}
        placeholder="E.g. Runs on Windows 11 with an AMD RX 7900 XT. Restarts nightly at 03:00, which logs 'terminated' lines."
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {draft.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
        </span>
        <Button
          onClick={() => save.mutate()}
          disabled={draft === saved || save.isPending}
        >
          {save.isPending ? "Saving..." : "Save notes"}
        </Button>
      </div>
    </>
  );
}
