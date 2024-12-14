import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/app/_providers/trpc-provider";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function DeleteChapterModal ({ id }: { id: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const deleteChapter = trpc.deleteChapter.useMutation({
    onSuccess: () => {
      toast({ description: "Chapter deleted successfully." });

      utils.getAllChapters.invalidate().then(() => {
        setOpen(false);
      });
    },
    onError: () => {
      toast({ description: "Failed to delete", variant: "destructive" });
    },
  });

  const onDelete = () => {
    deleteChapter.mutate({ id });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="w-full border outline outline-2"
          variant="outline"
          size="sm"
          data-cy="delete-chapter"
        >
            Delete Chapter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Chapter</DialogTitle>
          <DialogDescription>
              Confirm you want to delete this chapter
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

export default DeleteChapterModal;
