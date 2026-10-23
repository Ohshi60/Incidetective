import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { CreateIncidentForm } from "./CreateIncidentForm";
import { PlusIcon } from "@phosphor-icons/react";

export function CreateIncidentDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon size={16} weight="bold" />
        New Incident
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create incident</DialogTitle>
          <DialogDescription>
            Create a new incident to begin investigating
          </DialogDescription>
        </DialogHeader>
        <CreateIncidentForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
