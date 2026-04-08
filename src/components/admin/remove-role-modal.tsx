"use client";

import { useState } from "react";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

interface RemoveRoleModalProps {
  adminUserId: string;
  roleName:    string;
  tenantId:    string;
  publisherId?: string;
}

export default function RemoveRoleModal({
  adminUserId,
  roleName,
  tenantId,
  publisherId,
}: RemoveRoleModalProps) {
  const { toast } = useToast();
  const utils     = trpc.useUtils();
  const [open, setOpen] = useState(false);

  const mutation = trpc.removeRoleFromAdminUser.useMutation({
    onSuccess: () => {
      toast({ title: `Role "${roleName}" removed.` });
      utils.getAllAdminUsers.invalidate();
      setOpen(false);
    },
    onError: (err) =>
      toast({ variant: "destructive", title: "Failed", description: err.message }),
  });

  return (
    <>
      {/* Trigger — small X button inline with the role badge */}
      <button
        onClick={() => setOpen(true)}
        className="h-5 w-5 flex items-center justify-center hover:bg-red-100 border border-transparent hover:border-red-300 transition-colors"
        data-cy="remove-role"
      >
        <X className="h-3 w-3 text-red-600" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm border-4 border-black rounded-none gumroad-shadow">
          <DialogHeader className="border-b-2 border-black pb-4">
            <DialogTitle className="font-black uppercase italic tracking-tighter text-xl">
              Remove Role
            </DialogTitle>
            <DialogDescription className="text-sm font-bold mt-2 text-muted-foreground">
              Remove <span className="text-black font-black uppercase">{roleName}</span> from
              this staff member?
              {publisherId && (
                <span className="block mt-1 text-[10px] opacity-60">
                  This removes only the publisher-scoped assignment.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              className="booka-button-secondary flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ admin_user_id: adminUserId, tenant_id: tenantId, role_name: roleName, publisher_id: publisherId })}
              className="flex-1 border-2 border-black font-black uppercase italic"
            >
              {mutation.isPending ? "Removing..." : "Remove Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}