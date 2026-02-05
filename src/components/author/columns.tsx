"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Trash2, Edit3, UserCircle } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";
import AuthorForm from "./author-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const menuButtonStyle = "w-full text-left px-3 py-2.5 text-xs font-black uppercase italic hover:bg-accent cursor-pointer flex items-center gap-2 transition-colors rounded-none outline-none border-none bg-transparent text-black shadow-none";

function AuthorAction({ author }: { author: any }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const deleteAuthor = trpc.deleteAuthor.useMutation({
    onSuccess: () => {
      toast({ title: "Removed", description: "Author removed from your organization roster." });
      utils.getAuthorsByUser.invalidate();
    }
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 border-2 border-transparent hover:border-black rounded-none">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-none border-4 border-black gumroad-shadow w-56 p-0 bg-white">
        <DropdownMenuLabel className="font-black uppercase italic text-[10px] opacity-40 px-3 py-2 border-b-2 border-black/10">
          Roster Control
        </DropdownMenuLabel>
        
        <AuthorForm 
          action="Edit" 
          author={author} 
          trigger={<div className={menuButtonStyle}><Edit3 size={14} /> Edit Profile</div>}
        />

        <DropdownMenuSeparator className="bg-black m-0 h-[2px]" />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <div className={`${menuButtonStyle} text-red-600 focus:bg-red-50 focus:text-red-600`}>
              <Trash2 size={14} /> Delete Author
            </div>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-none border-4 border-black bg-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Author?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove <span className="text-black font-black underline">{author.user?.first_name}</span> from your publisher roster.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-none border-2 border-black">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteAuthor.mutate({ id: author.id })} className="rounded-none border-2 border-black bg-red-600">
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const authorColumns: ColumnDef<any>[] = [
  {
    accessorKey: "user",
    header: "Author Details",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center font-black italic shadow-[2px_2px_0px_rgba(0,0,0,1)]">
          {row.original.user?.first_name?.[0]}
        </div>
        <div className="flex flex-col">
          <span className="font-black uppercase italic text-sm tracking-tighter leading-none">
            {row.original.user?.first_name} {row.original.user?.last_name}
          </span>
          <span className="text-[10px] font-bold opacity-40 uppercase mt-1">{row.original.user?.email}</span>
        </div>
      </div>
    )
  },
  {
    accessorKey: "books",
    header: "Published Works",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-black italic underline text-sm">{(row.original.books || []).length}</span>
        <span className="text-[10px] font-bold opacity-30 uppercase tracking-tighter">Books</span>
      </div>
    )
  },
  {
    id: "actions",
    cell: ({ row }) => <AuthorAction author={row.original} />,
  },
];