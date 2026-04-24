"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Power, ShieldOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type PlatformUserRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  username: string | null;
  active: boolean;
  deleted_at: Date | null;
  created_at: Date;
  author: { id: string } | null;
  publisher: { id: string; slug: string | null } | null;
  customers: Array<{ id: string }>;
  claims: Array<{ role_name: string | null }>;
};

function getRoleLabels(row: PlatformUserRow) {
  const roleSet = new Set<string>();

  if (row.author) roleSet.add("author");
  if (row.publisher) roleSet.add("publisher");
  if (row.customers.length > 0) roleSet.add("reader");

  row.claims.forEach((claim) => {
    if (claim.role_name) {
      roleSet.add(claim.role_name);
    }
  });

  return Array.from(roleSet);
}

function StatusBadge({ row }: { row: PlatformUserRow }) {
  if (row.deleted_at) {
    return (
      <span className="inline-flex items-center border border-red-400 bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
        Deleted
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
        row.active ? "border-black bg-accent" : "border-amber-400 bg-amber-100"
      }`}
    >
      {row.active ? "Active" : "Suspended"}
    </span>
  );
}

export function buildUserColumns({
  onToggleActive,
  onSoftDelete,
  onPermanentDelete,
  isBusy,
}: {
  onToggleActive: (row: PlatformUserRow) => void;
  onSoftDelete: (row: PlatformUserRow) => void;
  onPermanentDelete: (row: PlatformUserRow) => void;
  isBusy: boolean;
}): ColumnDef<PlatformUserRow>[] {
  return [
    {
      id: "name",
      accessorFn: (row) => `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim(),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => {
        const user = row.original;
        const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
        return (
          <div className="py-0.5">
            <p className="text-sm font-black">{name || "Unnamed User"}</p>
            <p className="text-[10px] opacity-50">{user.username ? `@${user.username}` : user.email}</p>
          </div>
        );
      },
    },
    {
      id: "email",
      accessorKey: "email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: ({ row }) => <p className="text-sm font-medium">{row.original.email}</p>,
    },
    {
      id: "roles",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Roles" />,
      cell: ({ row }) => {
        const roles = getRoleLabels(row.original);
        return roles.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {roles.map((role) => (
              <span
                key={role}
                className="inline-block border border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide"
              >
                {role}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[10px] font-bold uppercase opacity-30">No role</span>
        );
      },
    },
    {
      id: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <StatusBadge row={row.original} />,
    },
    {
      id: "actions",
      enableHiding: false,
      header: () => null,
      cell: ({ row }) => {
        const user = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-accent border border-transparent hover:border-black"
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-2 border-black rounded-none min-w-[190px]">
              <DropdownMenuLabel className="font-black uppercase text-[10px] tracking-widest">
                User Actions
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-black/10" />
              <DropdownMenuItem
                disabled={isBusy || !!user.deleted_at}
                onSelect={() => onToggleActive(user)}
                className="gap-2 font-bold text-xs uppercase cursor-pointer focus:bg-accent"
              >
                {user.active ? <ShieldOff className="size-3" /> : <Power className="size-3" />}
                {user.active ? "Suspend User" : "Restore User"}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isBusy || !!user.deleted_at}
                onSelect={() => onSoftDelete(user)}
                className="gap-2 font-bold text-xs uppercase cursor-pointer focus:bg-accent"
              >
                <Trash2 className="size-3" />
                Delete User
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-black/10" />
              <DropdownMenuItem
                disabled={isBusy}
                onSelect={() => onPermanentDelete(user)}
                className="gap-2 font-bold text-xs uppercase cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700"
              >
                <Trash2 className="size-3" />
                Permanent Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
