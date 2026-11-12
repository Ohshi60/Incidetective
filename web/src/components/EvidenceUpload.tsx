import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { importLogs } from "@/api/logs";
import { uploadDiagnostic, fetchDiagnostics } from "@/api/diagnostics";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";

type EvidenceType = "logs" | "diagnostic";

interface Props {
  incidentId: string;
  onImported?: () => void;
}

export function EvidenceUpload({ incidentId, onImported }: Props) {
  const [type, setType] = useState<EvidenceType>("logs");
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const diagnostics = useQuery({
    queryKey: ["incidents", incidentId, "diagnostics"],
    queryFn: () => fetchDiagnostics(incidentId),
  });

  const upload = useMutation({
    mutationFn: async ({ type, file }: { type: EvidenceType; file: File }) => {
      if (type === "logs") {
        const result = await importLogs(incidentId, file);
        return {
          type,
          imported: result.imported,
        };
      }

      await uploadDiagnostic(incidentId, file);

      return {
        type,
        imported: 1,
      };
    },

    onSuccess: async ({ type, imported }) => {
      await queryClient.invalidateQueries({
        queryKey: ["incidents", incidentId],
      });

      setFile(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      if (imported > 0) {
        onImported?.();
      }

      toast.success(
        type === "logs"
          ? `Imported ${imported} logs`
          : "Diagnostic evidence uploaded",
      );
    },

    onError: (error) => {
      toast.error(error.message);
    },
  });

  function changeType(nextType: EvidenceType) {
    if (upload.isPending) return;

    setType(nextType);
    setFile(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add evidence</CardTitle>
        <CardDescription>
          Upload application logs or supporting diagnostic output.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={type === "logs" ? "default" : "outline"}
            aria-pressed={type === "logs"}
            disabled={upload.isPending}
            onClick={() => changeType("logs")}
          >
            Application logs
          </Button>

          <Button
            type="button"
            variant={type === "diagnostic" ? "default" : "outline"}
            aria-pressed={type === "diagnostic"}
            disabled={upload.isPending}
            onClick={() => changeType("diagnostic")}
          >
            Raw diagnostics
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          {type === "logs"
            ? "Timestamped application logs. Events are parsed, grouped, and included in the investigation."
            : "Raw command output, stack traces, or diagnostic logs. Content is preserved and supplied to the AI as supporting evidence."}
        </p>

        <form
          className="space-y-4 rounded-lg border border-dashed p-5"
          onSubmit={(event) => {
            event.preventDefault();

            if (!file || upload.isPending) return;

            upload.mutate({ type, file });
          }}
        >
          <Input
            ref={inputRef}
            type="file"
            accept={type === "logs" ? ".jsonl,.log" : ".log,.txt,.out,.stderr"}
            disabled={upload.isPending}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
            }}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={!file || upload.isPending}>
              {upload.isPending
                ? "Uploading..."
                : type === "logs"
                  ? "Import logs"
                  : "Upload diagnostic"}
            </Button>
          </div>
        </form>

        {diagnostics.data && diagnostics.data.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <h4 className="text-sm font-medium">
              Attached diagnostics ({diagnostics.data.length})
            </h4>

            <ul className="space-y-1 text-sm text-muted-foreground">
              {diagnostics.data.map((item) => (
                <li key={item.id} className="break-all">
                  {item.fileName}
                </li>
              ))}
            </ul>
          </div>
        )}

        {diagnostics.isError && (
          <p className="text-sm text-destructive">
            Failed to load diagnostic files.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
