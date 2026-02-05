"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Trash2, Edit3, ExternalLink, Globe } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/app/_providers/trpc-provider";
import PublisherForm from "./publisher-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const menuButtonStyle = "w-full text-left px-3 py-2.5 text-xs font-black uppercase italic hover:bg-accent cursor-pointer flex items-center gap-2 transition-colors rounded-none outline-none border-none bg-transparent text-black shadow-none";

function PublisherAction({ publisher }: { publisher: any }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const deletePublisher = trpc.deletePublisher.useMutation({
    onSuccess: () => {
      toast({ title: "Removed", description: "Publisher and associated tenant account deactivated." });
      utils.getAllPublisher.invalidate();
    }
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 border-2 border-transparent hover:border-black rounded-none">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-none border-4 border-black gumroad-shadow w-64 p-0 bg-white">
        <DropdownMenuLabel className="font-black uppercase italic text-[10px] opacity-40 px-3 py-2 border-b-2 border-black/10">
          Entity Control
        </DropdownMenuLabel>
        
        <PublisherForm 
          action="Edit" 
          publisher={publisher} 
          trigger={<div className={menuButtonStyle}><Edit3 size={14} /> Update Entity</div>}
        />

        <a href={`https://${publisher.slug}.booka.africa`} target="_blank" className={menuButtonStyle}>
          <ExternalLink size={14} /> Visit Storefront
        </a>

        <DropdownMenuSeparator className="bg-black m-0 h-[2px]" />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <div className={`${menuButtonStyle} text-red-600 focus:bg-red-50 focus:text-red-600`}>
              <Trash2 size={14} /> Delete Publisher
            </div>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-none border-4 border-black bg-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate the "{publisher.tenant?.name}" organization and all its direct authors.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-none border-2 border-black">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deletePublisher.mutate({ id: publisher.id })} className="rounded-none border-2 border-black bg-red-600">
                Confirm Deletion
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const publisherColumns: ColumnDef<any>[] = [
  {
    accessorKey: "tenant.name",
    header: "Organization / Slug",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-black uppercase italic text-sm tracking-tighter leading-none">{row.original.tenant?.name}</span>
        <span className="text-[10px] font-bold opacity-40 uppercase mt-1">slug: {row.original.slug}</span>
      </div>
    ),
  },
  {
    accessorKey: "user",
    header: "Lead Publisher",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-black bg-accent flex items-center justify-center font-black text-[10px]">
          {row.original.user?.first_name?.[0]}
        </div>
        <span className="font-bold text-xs uppercase">{row.original.user?.first_name} {row.original.user?.last_name}</span>
      </div>
    )
  },
  {
    accessorKey: "custom_domain",
    header: "Subdomain / Address",
    cell: ({ row }) => {
      const slug = row.original.slug;
      // If a real custom domain is eventually added, we show it, 
      // otherwise we show the branded subdomain
      const displayDomain = row.original.custom_domain || `${slug}.booka.africa`;
      
      return (
        <div className="flex items-center gap-2 text-xs font-bold opacity-60 italic">
          <Globe size={12} className="shrink-0" />
          <span className="truncate max-w-[150px]">{displayDomain}</span>
        </div>
      );
    }
  },
  {
    id: "actions",
    cell: ({ row }) => <PublisherAction publisher={row.original} />,
  },
];