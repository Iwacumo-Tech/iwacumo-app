"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, RefreshCw, Trash2, Pencil } from "lucide-react";
import DeleteAdminUserModal from "./delete-admin-user";

// ── Shared row type ───────────────────────────────────────────
// Matches what getAllAdminUsers / getAdminUsersByTenant returns.
// Defined once here and re-exported so both column files share it.
export type AdminUserRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
  password_hash: string | null;
  email_verified_at: Date | null;
  tenant?: { id: string; name: string | null };
  roles?: Array<{
    role_name: string;
    publisher_id: string | null;
    publisher?: { slug: string | null } | null;
    role: { name: string; description: string | null };
  }>;
};

// ── Status badge — iwacumo design language ────────────────────
const STATUS_STYLES: Record<string, { bg: string; label: string }> = {
  active:    { bg: "bg-accent border-black",             label: "Active"    },
  invited:   { bg: "bg-yellow-100 border-yellow-400",    label: "Invited"   },
  suspended: { bg: "bg-red-100 border-red-400",          label: "Suspended" },
  archived:  { bg: "bg-gray-100 border-gray-400",        label: "Archived"  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_STYLES[status] ?? STATUS_STYLES.invited;
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${cfg.bg}`}
    >
      {cfg.label}
    </span>
  );
}

// ── Actions cell ──────────────────────────────────────────────
interface ActionProps {
  row: AdminUserRow;
  onResendInvite: (id: string) => void;
  resendPending: boolean;
}

function Actions({ row, onResendInvite, resendPending }: ActionProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0 hover:bg-accent border border-transparent hover:border-black"
          data-cy="admin-user-action"
        >
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-2 border-black rounded-none min-w-[180px]">
        <DropdownMenuLabel className="font-black uppercase text-[10px] tracking-widest">
          Staff Actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-black/10" />

        {/* Resend invite — only shown for pending staff */}
        {row.status === "invited" && (
          <>
            <DropdownMenuItem
              className="gap-2 font-bold text-xs uppercase cursor-pointer focus:bg-accent"
              disabled={resendPending}
              onSelect={() => onResendInvite(row.id)}
            >
              <RefreshCw className="size-3" />
              Resend Invite
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-black/10" />
          </>
        )}

        <DropdownMenuItem asChild className="focus:bg-accent p-0">
          <DeleteAdminUserModal id={row.id} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Column factory — takes callbacks so the page controls state ─
// We use a factory function instead of a plain array so we can
// pass `onResendInvite` and `resendPending` down into the cell
// without global state or context.
export function buildAdminColumns({
  onResendInvite,
  resendPending,
}: {
  onResendInvite: (id: string) => void;
  resendPending: boolean;
}): ColumnDef<AdminUserRow>[] {
  return [
    {
      id: "name",
      accessorKey: "first_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const name = [row.original.first_name, row.original.last_name]
          .filter(Boolean)
          .join(" ");
        return (
          <div className="py-0.5">
            <p className="text-sm font-black text-nowrap">
              {name || <span className="opacity-40 italic font-normal">Not set</span>}
            </p>
            {/* Show email as sub-line on mobile */}
            <p className="text-[10px] opacity-50 md:hidden">{row.original.email}</p>
          </div>
        );
      },
    },
    {
      id: "email",
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => (
        <p className="text-sm font-medium text-nowrap">{row.getValue("email")}</p>
      ),
    },
    {
      id: "role",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => {
        const roles = row.original.roles ?? [];
        if (roles.length === 0) {
          return <span className="text-[10px] font-bold uppercase opacity-30">No role</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((r, i) => (
              <span
                key={i}
                className="inline-block border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wide bg-white"
              >
                {r.role.name}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      id: "actions",
      enableHiding: false,
      header: () => null,
      cell: ({ row }) => (
        <Actions
          row={row.original}
          onResendInvite={onResendInvite}
          resendPending={resendPending}
        />
      ),
    },
  ];
}