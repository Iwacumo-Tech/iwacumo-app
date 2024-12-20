"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/app/_providers/trpc-provider";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function DeleteTenantModal({ id }: { id: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const deleteTenant = trpc.deleteTenant.useMutation({
    onSuccess: () => {
      toast({ description: "Tenant deleted successfully." });

      utils.getAllTenant.invalidate().then(() => {
        setOpen(false);
      });
    },
    onError: () => {
      toast({ description: "Failed to delete tenant", variant: "destructive" });
    },
  });

  const onDelete = () => {
    deleteTenant.mutate({ id });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="w-full border outline outline-2"
          variant="outline"
          size="sm"
          data-cy="delete-tenant"
        >
          Delete Tenant
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Tenant</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this tenant? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              data-cy="cancel-button"
              className="active:outline outline-2"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            key="confirm-delete-button"
            className="outline outline-2"
            variant="outline"
            data-cy="confirm-delete-button"
            onClick={onDelete}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteTenantModal;
