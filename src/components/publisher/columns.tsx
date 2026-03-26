"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Trash2,
  Edit3,
  ExternalLink,
  Globe,
  Shield,
  ShieldOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/app/_providers/trpc-provider";
import PublisherForm from "./publisher-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const menuButtonStyle =
  "w-full text-left px-3 py-2.5 text-xs font-black uppercase italic hover:bg-accent cursor-pointer flex items-center gap-2 transition-colors rounded-none outline-none border-none bg-transparent text-black shadow-none";

// ─────────────────────────────────────────────────────────────────────────────
// Inline white-label toggle — used both in the table column and in the menu
// ─────────────────────────────────────────────────────────────────────────────

function WhiteLabelToggle({
  publisher,
  compact = false,
}: {
  publisher: any;
  compact?: boolean;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const toggle = trpc.updatePublisher.useMutation({
    onSuccess: (_, vars) => {
      toast({
        title: vars.white_label ? "White-label enabled" : "White-label disabled",
        description: `${publisher.tenant?.name} updated.`,
      });
      utils.getAllPublisher.invalidate();
    },
    onError: (err) =>
      toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  if (compact) {
    // Used inside the dropdown — label + switch side by side
    return (
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="flex items-center gap-2 text-xs font-black uppercase italic">
          {publisher.white_label ? (
            <Shield size={14} className="text-blue-600" />
          ) : (
            <ShieldOff size={14} className="opacity-40" />
          )}
          White-Label
        </span>
        <Switch
          checked={!!publisher.white_label}
          disabled={toggle.isPending}
          onCheckedChange={(checked) =>
            toggle.mutate({ id: publisher.id, white_label: checked })
          }
        />
      </div>
    );
  }

  // Used in the table column — badge style with clickable toggle
  return (
    <button
      onClick={() =>
        toggle.mutate({ id: publisher.id, white_label: !publisher.white_label })
      }
      disabled={toggle.isPending}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 border-2 text-[9px] font-black uppercase tracking-widest transition-all",
        publisher.white_label
          ? "bg-blue-600 border-blue-800 text-white hover:bg-blue-700"
          : "bg-white border-black/20 text-black/40 hover:border-black hover:text-black"
      )}
    >
      {publisher.white_label ? (
        <>
          <Shield size={10} /> White-Label
        </>
      ) : (
        <>
          <ShieldOff size={10} /> Standard
        </>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Action menu
// ─────────────────────────────────────────────────────────────────────────────

function PublisherAction({ publisher }: { publisher: any }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: session } = useSession();
  const isSuperAdmin = session?.roles?.some((r) => r.name === "super-admin");
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const deletePublisher = trpc.deletePublisher.useMutation({
    onSuccess: () => {
      toast({
        title: "Removed",
        description: "Publisher and associated tenant account deactivated.",
      });
      utils.getAllPublisher.invalidate();
    },
    onError: (err) =>
      toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const orgName   = publisher.tenant?.name  ?? "Unknown Org";
  const leadName  = [publisher.user?.first_name, publisher.user?.last_name]
    .filter(Boolean)
    .join(" ") || "—";
  const initials  = (publisher.user?.first_name?.[0] ?? publisher.tenant?.name?.[0] ?? "?").toUpperCase();

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0 border-2 border-transparent hover:border-black rounded-none"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="rounded-none border-4 border-black gumroad-shadow w-72 p-0 bg-white"
      >
        {/* ── Context header: who is this menu for ─────────────── */}
        <div className="flex items-center gap-3 px-3 py-3 border-b-2 border-black bg-black text-white">
          <div className="w-9 h-9 rounded-full border-2 border-white/30 bg-accent text-black flex items-center justify-center font-black text-xs shrink-0">
            {initials}
          </div>
          <div className="overflow-hidden">
            <p className="font-black uppercase italic text-xs tracking-tight leading-tight truncate">
              {orgName}
            </p>
            <p className="text-[9px] font-bold opacity-50 uppercase truncate">
              {leadName}
            </p>
          </div>
        </div>

        {/* 1. Edit */}
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          className="p-0 focus:bg-transparent"
        >
          <PublisherForm
            action="Edit"
            publisher={publisher}
            trigger={
              <div className={menuButtonStyle}>
                <Edit3 size={14} /> Update Entity
              </div>
            }
          />
        </DropdownMenuItem>

        {/* 2. Visit storefront */}
        <a
          href={`https://${publisher.slug}.booka.africa`}
          target="_blank"
          rel="noopener noreferrer"
          className={menuButtonStyle}
          onClick={() => setIsMenuOpen(false)}
        >
          <ExternalLink size={14} /> Visit Storefront
        </a>

        {/* 3. White-label toggle (super admin only) */}
        {isSuperAdmin && (
          <>
            <DropdownMenuSeparator className="bg-black m-0 h-[2px]" />
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="p-0 focus:bg-transparent"
            >
              <WhiteLabelToggle publisher={publisher} compact />
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator className="bg-black m-0 h-[2px]" />

        {/* 4. Delete */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <div
              className={cn(
                menuButtonStyle,
                "text-red-600 focus:bg-red-50 focus:text-red-600"
              )}
            >
              <Trash2 size={14} /> Delete Publisher
            </div>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-none border-4 border-black bg-white gumroad-shadow-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black uppercase italic text-2xl tracking-tighter">
                Are you sure?
              </AlertDialogTitle>
              <AlertDialogDescription className="font-bold text-black/60">
                This will deactivate{" "}
                <span className="text-black underline">"{orgName}"</span> and
                all its direct authors.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-4">
              <AlertDialogCancel className="rounded-none border-2 border-black font-black uppercase italic text-xs hover:bg-accent transition-colors">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletePublisher.mutate({ id: publisher.id })}
                className="rounded-none border-2 border-black bg-red-600 text-white font-black uppercase italic text-xs hover:bg-red-700 transition-colors"
              >
                Confirm Deletion
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Missing React import (columns files need it for useState)
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Column definitions
// ─────────────────────────────────────────────────────────────────────────────

export const publisherColumns: ColumnDef<any>[] = [
  {
    accessorKey: "tenant.name",
    header: "Organization / Slug",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-black uppercase italic text-sm tracking-tighter leading-none">
          {row.original.tenant?.name}
        </span>
        <span className="text-[10px] font-bold opacity-40 uppercase mt-1">
          slug: {row.original.slug}
        </span>
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
        <span className="font-bold text-xs uppercase">
          {row.original.user?.first_name} {row.original.user?.last_name}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "custom_domain",
    header: "Subdomain / Address",
    cell: ({ row }) => {
      const slug          = row.original.slug;
      const displayDomain = row.original.custom_domain || `${slug}.booka.africa`;
      return (
        <div className="flex items-center gap-2 text-xs font-bold opacity-60 italic">
          <Globe size={12} className="shrink-0" />
          <span className="truncate max-w-[150px]">{displayDomain}</span>
        </div>
      );
    },
  },
  {
    // White-label status as a dedicated, visible column with an inline toggle
    accessorKey: "white_label",
    header: "White-Label",
    cell: ({ row }) => <WhiteLabelToggle publisher={row.original} />,
  },
  {
    id: "actions",
    cell: ({ row }) => <PublisherAction publisher={row.original} />,
  },
];