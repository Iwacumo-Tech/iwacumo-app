"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";
import { X } from "lucide-react";
import { DialogClose } from "@radix-ui/react-dialog";

interface RemoveRoleModalProps {
  adminUserId: string;
  roleName: string;
  tenantId: string;
  publisherId?: string;
}

export default function RemoveRoleModal({
  adminUserId,
  roleName,
  tenantId,
  publisherId,
}: RemoveRoleModalProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);

  const removeRole = trpc.removeRoleFromAdminUser.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully removed role",
      });

      await utils.getAdminUsersByTenant.invalidate({ tenant_id: tenantId });
      setOpen(false);
    },
    onError: async (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: error.message || "Error removing role",
      });
    },
  });

  const handleRemove = () => {
    removeRole.mutate({
      admin_user_id: adminUserId,
      tenant_id: tenantId,
      role_name: roleName,
      publisher_id: publisherId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-red-100"
          data-cy="remove-role"
        >
          <X className="h-3 w-3 text-red-600" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Role</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove the role "{roleName}" from this staff member?
            {publisherId && " This will only remove the publisher-scoped role assignment."}
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
            key="submit-button"
            className="outline outline-2"
            variant="destructive"
            data-cy="confirm-remove-button"
            onClick={handleRemove}
          >
            Remove Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

