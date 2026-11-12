import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { uploadDiagnostic, fetchDiagnostics } from "@/api/diagnostics";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface Props {
  incidentId: string;
  onImported?: () => void;
}

export function DiagnosticUpload({ incidentId, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const diagnostics = useQuery({
    queryKey: ["incidents", incidentId, "diagnostics"],
    queryFn: () => fetchDiagnostics(incidentId),
  });

  const upload = useMutation({
    mutationFn: (file: File) => uploadDiagnostic(incidentId, file),

    onSuccess: async () => {
      setFile(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      await queryClient.invalidateQueries({
        queryKey: ["incidents", incidentId, "diagnostics"],
      });

      onImported?.();
      toast.success("Diagnostic evidence uploaded");
    },

    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagnostic evidence</CardTitle>
        <CardDescription>
          Upload raw diagnostic output, such as FFmpeg logs, stack traces, or
          command output.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (file && !upload.isPending) {
              upload.mutate(file);
            }
          }}
        >
          <Input
            ref={inputRef}
            type="file"
            accept=".log,.txt,.out,.stderr"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
            }}
          />

          <Button type="submit" disabled={!file || upload.isPending}>
            {upload.isPending ? "Uploading..." : "Upload diagnostic"}
          </Button>
        </form>

        {diagnostics.data && diagnostics.data.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              Uploaded diagnostics ({diagnostics.data.length})
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
