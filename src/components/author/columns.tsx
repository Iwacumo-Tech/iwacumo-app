"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Edit3, Building2, ShieldCheck, ShieldOff, Mail } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";
import AuthorForm from "./author-form";
import { useSession } from "next-auth/react";

const menuButtonStyle = "w-full text-left px-3 py-2.5 text-xs font-black uppercase italic hover:bg-accent cursor-pointer flex items-center gap-2 transition-colors rounded-none outline-none border-none bg-transparent text-black shadow-none";

function countPublishedWorks(author: any) {
  const seen = new Set<string>();
  const relatedBooks = [...(author?.books ?? []), ...(author?.primary_books ?? [])];

  return relatedBooks.reduce((count: number, book: any) => {
    if (!book?.id || seen.has(book.id) || book.deleted_at) return count;
    seen.add(book.id);

    if (!book.published || book.status === "archived") return count;
    return count + 1;
  }, 0);
}

function AuthorAction({ author }: { author: any }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: session } = useSession();

  const toggleUserActive = trpc.toggleUserActive.useMutation({
    onSuccess: () => {
      const nextActiveState = !author.user?.active;
      toast({
        title: nextActiveState ? "Author restored" : "Author suspended",
        description: nextActiveState
          ? "This author can sign in and publish again."
          : "This author can no longer sign in until restored.",
      });
      utils.getAllAuthors.invalidate();
      utils.getAuthorsByUser.invalidate();
    },
  });

  const isActive = Boolean(author.user?.active);
  const canToggle = Boolean(author.user?.id);
  const canInvite = !!author.publisher?.white_label && author.onboarding_status !== "active";
  const resendAuthorInvite = trpc.resendAuthorInvite.useMutation({
    onSuccess: () => {
      toast({ title: "Invite sent", description: "The onboarding email has been sent to the author." });
      utils.getAllAuthors.invalidate();
      utils.getAuthorsByUser.invalidate();
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Invite failed", description: err.message });
    },
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

        {canInvite && (
          <button
            type="button"
            onClick={() => {
              const fallbackEmail = author.invite_email && !author.invite_email.endsWith("@placeholder.iwacumo.local")
                ? author.invite_email
                : author.user?.email && !author.user.email.endsWith("@placeholder.iwacumo.local")
                ? author.user.email
                : "";
              const email = window.prompt("Enter the email address to send this author's onboarding invite.", fallbackEmail);
              if (!email) return;
              resendAuthorInvite.mutate({
                author_id: author.id,
                inviter_user_id: session?.user?.id || "",
                email,
              });
            }}
            disabled={resendAuthorInvite.isPending || !session?.user?.id}
            className={`${menuButtonStyle} text-blue-700 focus:bg-blue-50 focus:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <Mail size={14} />
            {author.onboarding_status === "invited" ? "Resend Invite" : "Send Invite"}
          </button>
        )}

        {(canInvite || canToggle) && <DropdownMenuSeparator className="bg-black m-0 h-[2px]" />}

        <button
          type="button"
          disabled={!canToggle || toggleUserActive.isPending}
          onClick={() => {
            if (!author.user?.id) return;
            toggleUserActive.mutate({ id: author.user.id, active: !isActive });
          }}
          className={`${menuButtonStyle} ${isActive ? "text-red-600 focus:bg-red-50 focus:text-red-600" : "text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700"} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {isActive ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
          {isActive ? "Suspend Author" : "Restore Author"}
        </button>
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
              {row.original.pen_name || `${row.original.user?.first_name} ${row.original.user?.last_name}`.trim()}
            </span>
            <span className="text-[10px] font-bold opacity-40 uppercase mt-1">
              {row.original.pen_name ? `${row.original.user?.first_name} ${row.original.user?.last_name}` : row.original.user?.email}
            </span>
          </div>
        </div>
    )
  },
  {
    accessorKey: "publisher",
    header: "Publisher",
    cell: ({ row }) => {
      const publisherName = row.original.publisher?.tenant?.name ?? "Independent";
      const publisherSlug = row.original.publisher?.slug;

      return (
        <div className="flex items-start gap-2">
          <Building2 size={14} className="mt-0.5 shrink-0 opacity-40" />
          <div className="flex flex-col">
            <span className="font-black uppercase text-[11px] tracking-widest">{publisherName}</span>
            <span className="text-[10px] font-bold opacity-40 uppercase mt-1">
              {publisherSlug ? `/${publisherSlug}` : "No publisher slug"}
            </span>
          </div>
        </div>
      );
    }
  },
  {
    accessorKey: "books",
    header: "Published Works",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-black italic underline text-sm">{countPublishedWorks(row.original)}</span>
        <span className="text-[10px] font-bold opacity-30 uppercase tracking-tighter">Books</span>
      </div>
    )
  },
  {
    id: "actions",
    cell: ({ row }) => <AuthorAction author={row.original} />,
  },
];
