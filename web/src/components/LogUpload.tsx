import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importLogs } from "@/api/logs";
import { toast } from "sonner";
import type { SubmitEvent } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface LogUploadProps {
  incidentId: string;
}
export function LogUpload({ incidentId }: LogUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (file: File) => importLogs(incidentId, file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["incidents", incidentId, "report"],
      });
      toast.success(`Successfully imported ${data.imported} logs`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file || mutation.isPending) return;

    mutation.mutate(file);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import evidence</CardTitle>
        <CardDescription>
          Upload JSONL logs to investigate this incident
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border-2 border-dashed p-6 text-center"
        >
          <Input
            type="file"
            accept=".jsonl"
            placeholder="Choose a logfile"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
            }}
          />
          <Button type="submit" disabled={!file || mutation.isPending}>
            {mutation.isPending ? "Importing..." : "Import logs"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
