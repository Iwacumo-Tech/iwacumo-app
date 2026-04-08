"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Banner } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Trash2, Eye, EyeOff, Globe } from "lucide-react";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";
import { cn } from "@/lib/utils";

function BannerActions({ banner }: { banner: Banner & { tenant?: { name: string | null } | null } }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const toggle = trpc.toggleBannerVisibility.useMutation({
    onSuccess: () => {
      toast({ description: `Banner ${banner.isShow ? "hidden" : "shown"}.` });
      utils.getAllBanners.invalidate();
    },
    onError: (err) => toast({ variant: "destructive", description: err.message }),
  });

  const deleteBanner = trpc.deleteBanner.useMutation({
    onSuccess: () => {
      toast({ title: "Banner Removed" });
      utils.getAllBanners.invalidate();
    },
    onError: (err) => toast({ variant: "destructive", description: err.message }),
  });

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toggle.mutate({ id: banner.id })}
        disabled={toggle.isPending}
        className={cn(
          "h-8 px-3 border-2 rounded-none text-[10px] font-black uppercase tracking-widest gap-1.5",
          banner.isShow
            ? "border-black hover:bg-black hover:text-white"
            : "border-black/30 text-black/40 hover:border-black hover:text-black"
        )}
      >
        {banner.isShow ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => { if (confirm("Delete this banner?")) deleteBanner.mutate({ id: banner.id }); }}
        disabled={deleteBanner.isPending}
        className="h-8 w-8 p-0 border-2 border-transparent hover:border-red-500 hover:text-red-600 rounded-none"
      >
        <Trash2 size={14} />
      </Button>
    </div>
  );
}

export const columns: ColumnDef<Banner & { tenant?: { name: string | null } | null }>[] = [
  {
    id: "image",
    accessorKey: "image",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Preview" />,
    cell: ({ row }) => (
      <div className="relative w-32 h-16 border-2 border-black overflow-hidden bg-black/5 shrink-0">
        {row.original.image
          ? <Image src={row.original.image} alt="Banner" fill className="object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-[8px] font-black opacity-20 uppercase">No img</div>
        }
      </div>
    ),
  },
  {
    id: "scope",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Scope" />,
    cell: ({ row }) => {
      const tenant = (row.original as any).tenant;
      return tenant
        ? <span className="text-[9px] font-black uppercase border border-black px-2 py-0.5">{tenant.name}</span>
        : <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-accent border border-black px-2 py-0.5"><Globe size={9} /> Global</span>;
    },
  },
  {
    id: "status",
    accessorKey: "isShow",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <span className={cn(
        "text-[9px] font-black uppercase px-2 py-0.5 border",
        row.original.isShow
          ? "bg-emerald-100 border-emerald-400 text-emerald-700"
          : "bg-gray-100 border-gray-300 text-gray-500"
      )}>
        {row.original.isShow ? "Visible" : "Hidden"}
      </span>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    header: () => null,
    cell: ({ row }) => <BannerActions banner={row.original} />,
  },
];