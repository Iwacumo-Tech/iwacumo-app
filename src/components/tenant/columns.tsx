import { Tenant } from "@prisma/client";
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
import DeleteTenantModal from "./DeleteBook";
import TenantForm from "./TenantForm";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";

interface TenantActionProps {
  tenant: Tenant;
}

function TenantAction({ tenant }: TenantActionProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" data-cy="tenant-action">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Tenant Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <TenantForm action="Edit" tenant={tenant} />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <DeleteTenantModal id={tenant.id} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const tenantColumns: ColumnDef<Tenant>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    accessorKey: "contact_email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contact Email" />
    ),
    cell: ({ row }) => <div>{row.getValue("contact_email")}</div>,
  },
  {
    accessorKey: "custom_domain",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Custom Domain" />
    ),
    cell: ({ row }) => <div>{row.getValue("custom_domain")}</div>,
  },
  {
    accessorKey: "slug",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Slug" />
    ),
    cell: ({ row }) => <div>{row.getValue("slug")}</div>,
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <TenantAction tenant={row.original} />,
  },
];
