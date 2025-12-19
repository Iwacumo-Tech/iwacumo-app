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
import { useSession } from "next-auth/react";
import { DialogClose } from "@radix-ui/react-dialog";

interface DeleteAdminUserModalProps {
  id: string;
}

export default function DeleteAdminUserModal({ id }: DeleteAdminUserModalProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const session = useSession();
  const [open, setOpen] = useState(false);

  // Get current user to determine tenant
  const { data: currentUser } = trpc.getUserById.useQuery({
    id: session.data?.user.id as string,
  });

  const tenantId = currentUser?.publisher?.tenant_id;

  const deleteAdminUser = trpc.deleteAdminUser.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully deleted staff member",
      });

      if (tenantId) {
        await utils.getAdminUsersByTenant.invalidate({ tenant_id: tenantId });
        setOpen(false);
      }
    },
    onError: async (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: error.message || "Error deleting staff member",
      });
    },
  });

  const handleDelete = () => {
    deleteAdminUser.mutate({ id });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="w-full border outline outline-2"
          variant="outline"
          size="sm"
          data-cy="delete-admin-user"
        >
          Delete Staff Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Staff Member</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete this staff member
            from your organization.
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
            data-cy="confirm-delete-button"
            onClick={handleDelete}
          >
            Confirm Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

