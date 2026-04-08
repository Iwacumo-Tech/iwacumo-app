"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { HeroSlide } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Trash2, Globe } from "lucide-react";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";

function DeleteSlideButton({ id }: { id: number }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const deleteSlide = trpc.deleteHeroSlide.useMutation({
    onSuccess: () => {
      toast({ title: "Slide Removed" });
      utils.getAllHeroSlides.invalidate();
    },
    onError: (err) => toast({ title: "Error", variant: "destructive", description: err.message }),
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        if (confirm("Remove this slide?")) deleteSlide.mutate({ id });
      }}
      className="h-8 w-8 p-0 border-2 border-transparent hover:border-red-500 hover:text-red-600 rounded-none"
    >
      <Trash2 size={14} />
    </Button>
  );
}

export const columns: ColumnDef<HeroSlide & { tenant?: { name: string | null; slug: string | null } | null }>[] = [
  {
    id: "image",
    accessorKey: "image",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Preview" />,
    cell: ({ row }) => (
      <div className="relative w-20 h-12 border-2 border-black overflow-hidden bg-black/5 shrink-0">
        {row.original.image
          ? <Image src={row.original.image} alt={row.original.title} fill className="object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-[8px] font-black opacity-20 uppercase">No img</div>
        }
      </div>
    ),
  },
  {
    id: "title",
    accessorKey: "title",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
    cell: ({ row }) => (
      <div>
        <p className="font-black uppercase italic text-sm tracking-tight">{row.original.title}</p>
        <p className="text-[10px] font-bold opacity-40 mt-0.5">{row.original.subtitle}</p>
      </div>
    ),
  },
  {
    id: "route",
    accessorKey: "buttonRoute",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Button" />,
    cell: ({ row }) => (
      <div>
        <p className="font-bold text-xs">{row.original.buttonText}</p>
        <p className="text-[10px] font-bold opacity-40 font-mono">{row.original.buttonRoute}</p>
      </div>
    ),
  },
  {
    id: "scope",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Scope" />,
    cell: ({ row }) => {
      const tenant = (row.original as any).tenant;
      return tenant
        ? <span className="text-[9px] font-black uppercase border border-black px-2 py-0.5">{tenant.name ?? tenant.slug}</span>
        : <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-accent border border-black px-2 py-0.5"><Globe size={9} /> Global</span>;
    },
  },
  {
    id: "actions",
    enableHiding: false,
    header: () => null,
    cell: ({ row }) => <DeleteSlideButton id={row.original.id} />,
  },
];