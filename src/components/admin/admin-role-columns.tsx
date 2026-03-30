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
import { MoreHorizontal } from "lucide-react";
import AssignRoleForm from "./assign-role-form";
import RemoveRoleModal from "./remove-role-modal";
import { type AdminUserRow } from "./admin-columns";

// ── Role label map — friendly names for the preset roles ─────
const ROLE_LABELS: Record<string, string> = {
  "staff-basic":     "Basic",
  "staff-content":   "Content",
  "staff-publisher": "Publisher Mgr",
  "staff-finance":   "Finance",
  "super-admin":     "Super Admin",
};

function RoleBadge({
  roleName,
  publisherSlug,
}: {
  roleName: string;
  publisherSlug?: string | null;
}) {
  const isSuperAdmin = roleName === "super-admin";
  return (
    <span
      className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide
        ${isSuperAdmin
          ? "bg-black text-white border-black"
          : "bg-white text-black border-black"
        }`}
    >
      {ROLE_LABELS[roleName] ?? roleName}
      {publisherSlug && (
        <span className="opacity-50 font-normal normal-case">
          · {publisherSlug}
        </span>
      )}
    </span>
  );
}

// ── Actions cell ──────────────────────────────────────────────
function Action({ adminUser }: { adminUser: AdminUserRow }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0 hover:bg-accent border border-transparent hover:border-black"
          data-cy="admin-role-action"
        >
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-2 border-black rounded-none min-w-[160px]">
        <DropdownMenuLabel className="font-black uppercase text-[10px] tracking-widest">
          Role Actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-black/10" />
        <DropdownMenuItem asChild className="focus:bg-accent p-0">
          <AssignRoleForm adminUser={adminUser} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Column definition ─────────────────────────────────────────
export const adminRoleColumns: ColumnDef<AdminUserRow>[] = [
  {
    id: "name",
    accessorKey: "first_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Staff Member" />
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
    id: "roles",
    accessorKey: "roles",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Assigned Roles" />
    ),
    cell: ({ row }) => {
      const roles = row.original.roles ?? [];

      if (roles.length === 0) {
        return (
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">
            No roles assigned
          </span>
        );
      }

      return (
        <div className="flex flex-wrap gap-1.5 py-0.5">
          {roles.map((r, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <RoleBadge
                roleName={r.role_name}
                publisherSlug={r.publisher?.slug}
              />
              <RemoveRoleModal
                adminUserId={row.original.id}
                roleName={r.role_name}
                tenantId={row.original.tenant_id}
                publisherId={r.publisher_id ?? undefined}
              />
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    header: () => null,
    cell: ({ row }) => <Action adminUser={row.original} />,
  },
];