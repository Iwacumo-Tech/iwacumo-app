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

function ToggleFeaturedModal({
  id,
  isFeatured,
}: {
  id: string;
  isFeatured: boolean;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const toggleFeatured = trpc.toggleBookFeatured.useMutation({
    onSuccess: () => {
      toast({
        description: `Book has been ${
          isFeatured ? "unmarked" : "marked"
        } as featured.`,
      });

      utils.getAllBooks.invalidate().then(() => {
        setOpen(false);
      });
    },
    onError: () => {
      toast({
        description: "Failed to update featured status",
        variant: "destructive",
      });
    },
  });

  const onToggle = () => {
    console.log("Toggling featured for book with ID:", id);
    toggleFeatured.mutate({ id });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="w-full border outline outline-2"
          variant={isFeatured ? "destructive" : "outline"}
          size="sm"
          data-cy="toggle-featured"
        >
          {isFeatured ? "Remove as Featured" : "Mark as Featured"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Action</DialogTitle>
          <DialogDescription>
            Are you sure you want to{" "}
            {isFeatured
              ? "remove the featured mark"
              : "mark this book as featured"}
            ?
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
            variant={isFeatured ? "destructive" : "outline"}
            data-cy="confirm-toggle-button"
            onClick={onToggle}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ToggleFeaturedModal;
