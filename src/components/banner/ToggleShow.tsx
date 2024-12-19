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

function ToggleBannerVisibilityModal({
  id,
  isShow,
}: {
  id: string;
  isShow: boolean;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const toggleBannerVisibility = trpc.toggleBannerVisibility.useMutation({
    onSuccess: () => {
      toast({
        description: `Banner has been ${isShow ? "hidden" : "made visible"}.`,
      });

      utils.getAllBanners.invalidate().then(() => {
        setOpen(false);
      });
    },
    onError: () => {
      toast({
        description: "Failed to update banner visibility.",
        variant: "destructive",
      });
    },
  });

  const onToggle = () => {
    console.log("Toggling visibility for banner with ID:", id);
    toggleBannerVisibility.mutate({ id });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="w-full border outline outline-2"
          variant={isShow ? "destructive" : "outline"}
          size="sm"
          data-cy="toggle-visibility"
        >
          {isShow ? "Hide Banner" : "Show Banner"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Action</DialogTitle>
          <DialogDescription>
            Are you sure you want to {isShow ? "hide" : "show"} this banner?
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
            variant={isShow ? "destructive" : "outline"}
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

export default ToggleBannerVisibilityModal;
