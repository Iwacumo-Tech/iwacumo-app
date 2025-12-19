import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { AdminUser } from "@prisma/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import AssignRoleForm from "./assign-role-form";
import RemoveRoleModal from "./remove-role-modal";

interface ActionProps {
  adminUser: AdminUser & { 
    tenant?: { id: string; name: string | null };
    roles?: Array<{
      role_name: string;
      publisher_id: string | null;
      publisher?: { slug: string | null };
      role: { name: string; description: string | null };
    }>;
  };
}

function Action({ adminUser }: ActionProps) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" data-cy="admin-role-action">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Role Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <AssignRoleForm adminUser={adminUser} />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export const adminRoleColumns: ColumnDef<AdminUser & { 
  tenant?: { id: string; name: string | null };
  roles?: Array<{
    role_name: string;
    publisher_id: string | null;
    publisher?: { slug: string | null };
    role: { name: string; description: string | null };
  }>;
}>[] = [
  {
    id: "name",
    accessorKey: "first_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Staff Member" />
    ),
    cell: ({ row }) => (
      <div className="py-0.5 text-sm font-medium select-none text-nowrap">
        {row.original.first_name} {row.original.last_name}
      </div>
    ),
  },
  {
    id: "email",
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => (
      <div className="py-0.5 text-sm font-medium select-none text-nowrap">
        {row.getValue("email")}
      </div>
    ),
  },
  {
    id: "roles",
    accessorKey: "roles",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Roles" />
    ),
    cell: ({ row }) => {
      const roles = row.original.roles || [];
      if (roles.length === 0) {
        return (
          <div className="py-0.5 text-sm text-gray-500 italic">
            No roles assigned
          </div>
        );
      }
      return (
        <div className="py-0.5 text-sm font-medium select-none">
          <div className="flex flex-wrap gap-1">
            {roles.map((adminUserRole, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {adminUserRole.role.name}
                  {adminUserRole.publisher_id && adminUserRole.publisher && (
                    <span className="ml-1 text-blue-600">
                      ({adminUserRole.publisher.slug || "Publisher"})
                    </span>
                  )}
                </span>
                <RemoveRoleModal
                  adminUserId={row.original.id}
                  roleName={adminUserRole.role_name}
                  tenantId={row.original.tenant_id}
                  publisherId={adminUserRole.publisher_id || undefined}
                />
              </div>
            ))}
          </div>
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Actions" />
    ),
    cell: ({ row }) => <Action adminUser={row.original} />,
  },
];

