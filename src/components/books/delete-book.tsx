"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/app/_providers/trpc-provider";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function DeleteBookModal ({ id }: { id: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const deleteBook = trpc.deleteBook.useMutation({
    onSuccess: () => {
      toast({ description: "Book deleted successfully." });

      utils.getAllBooks.invalidate().then(() => {
        setOpen(false);
      });
    },
    onError: () => {
      toast({ description: "Failed to delete", variant: "destructive" });
    },
  });

  const onDelete = () => {
    deleteBook.mutate({ id });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="w-full border outline outline-2"
          variant="outline"
          size="sm"
          data-cy="delete-book"
        >
          Delete Book
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete book</DialogTitle>
          <DialogDescription>
            Confirm you want to delete this book
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

export default DeleteBookModal;
