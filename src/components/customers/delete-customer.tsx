"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/app/_providers/trpc-provider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function DeleteCustomerModal({ id, trigger }: { id: string, trigger: React.ReactNode }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const deleteCustomer = trpc.deleteCustomer.useMutation({
    onSuccess: () => {
      toast({ title: "Removed", description: "Customer profile deleted." });
      utils.getCustomersByUser.invalidate();
    },
    onError: () => toast({ title: "Error", description: "Failed to delete customer.", variant: "destructive" })
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="rounded-none border-4 border-black bg-white gumroad-shadow">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-black uppercase italic text-2xl tracking-tighter">Confirm Deletion</AlertDialogTitle>
          <AlertDialogDescription className="font-bold text-black/60">
            This will permanently remove the customer profile from your directory. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-none border-2 border-black font-black uppercase italic text-xs hover:bg-accent">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => deleteCustomer.mutate({ id })} className="rounded-none border-2 border-black bg-red-600 text-white font-black uppercase italic text-xs hover:bg-red-700">
            Delete Permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}