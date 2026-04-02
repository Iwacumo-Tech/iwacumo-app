"use client";

import { useState } from "react";
import { trpc } from "@/app/_providers/trpc-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Trash2 } from "lucide-react";

interface DeleteCategoryProps {
  id: string;
  name: string;
  bookCount: number;
}

export function DeleteCategory({ id, name, bookCount }: DeleteCategoryProps) {
  const { toast } = useToast();
  const utils     = trpc.useUtils();
  const [open, setOpen] = useState(false);

  const mutation = trpc.deleteCategory.useMutation({
    onSuccess: () => {
      toast({ title: `"${name}" deleted.` });
      utils.getAllCategories.invalidate();
      setOpen(false);
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Cannot delete", description: err.message });
      setOpen(false);
    },
  });

  const hasBooks = bookCount > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost"
          className="h-8 w-8 p-0 hover:bg-red-50 border border-transparent hover:border-red-300 text-red-500">
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-black uppercase italic tracking-tighter">
            Delete Category
          </DialogTitle>
          <DialogDescription className="text-sm mt-2">
            {hasBooks ? (
              <>
                <span className="font-bold text-red-600">Cannot delete &quot;{name}&quot;</span>
                {" "}— it has{" "}
                <strong>{bookCount} book{bookCount === 1 ? "" : "s"}</strong> assigned.
                Reassign those books to another category first.
              </>
            ) : (
              <>
                Are you sure you want to delete{" "}
                <strong>&quot;{name}&quot;</strong>? This cannot be undone.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="booka-button-secondary"
            onClick={() => setOpen(false)}>
            Cancel
          </Button>
          {!hasBooks && (
            <Button
              variant="destructive"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ id })}
              className="border-2 border-black"
            >
              {mutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}