"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import AssignRoleForm   from "./assign-role-form";
import RemoveRoleModal  from "./remove-role-modal";
import { type AdminUserRow } from "./admin-columns";

// ── Role label map ────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  "staff-basic":     "Basic",
  "staff-content":   "Content",
  "staff-publisher": "Publisher Mgr",
  "staff-finance":   "Finance",
  "super-admin":     "Super Admin",
};

function RoleBadge({ roleName, publisherSlug }: { roleName: string; publisherSlug?: string | null }) {
  const isSuperAdmin = roleName === "super-admin";
  return (
    <span className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide
      ${isSuperAdmin ? "bg-black text-white border-black" : "bg-white text-black border-black"}`}
    >
      {ROLE_LABELS[roleName] ?? roleName}
      {publisherSlug && (
        <span className="opacity-50 font-normal normal-case">· {publisherSlug}</span>
      )}
    </span>
  );
}

// ── Actions cell ──────────────────────────────────────────────
// AssignRoleForm contains its own Dialog — it must NOT be nested
// inside DropdownMenuItem asChild (that causes the dialog trigger
// to conflict with the dropdown's radix portal). Instead we render
// it outside the dropdown, controlled by a shared open state.
function Action({ adminUser }: { adminUser: AdminUserRow }) {
  return (
    // AssignRoleForm renders its own trigger button styled as a menu item
    // so it fits naturally here without needing a DropdownMenu wrapper
    <AssignRoleForm adminUser={adminUser} />
  );
}

// ── Column definitions ────────────────────────────────────────
export const adminRoleColumns: ColumnDef<AdminUserRow>[] = [
  {
    id: "name",
    accessorKey: "first_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Staff Member" />,
    cell: ({ row }) => {
      const name = [row.original.first_name, row.original.last_name].filter(Boolean).join(" ");
      return (
        <div className="py-0.5">
          <p className="text-sm font-black text-nowrap">
            {name || <span className="opacity-40 italic font-normal">Not set</span>}
          </p>
          <p className="text-[10px] opacity-40">{row.original.email}</p>
        </div>
      );
    },
  },
  {
    id: "roles",
    accessorKey: "roles",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Assigned Roles" />,
    cell: ({ row }) => {
      const roles = row.original.roles ?? [];
      if (roles.length === 0) {
        return <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">No roles assigned</span>;
      }
      return (
        <div className="flex flex-wrap gap-1.5 py-0.5">
          {roles.map((r, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <RoleBadge roleName={r.role_name} publisherSlug={r.publisher?.slug} />
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
    // AssignRoleForm renders its own styled trigger button
    cell: ({ row }) => <Action adminUser={row.original} />,
  },
];