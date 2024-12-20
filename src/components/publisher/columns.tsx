import { Publisher, User } from "@prisma/client";
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
import DeletePublisherModal from "./delete-publisher";
import PublisherForm from "./publisher-form";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { EditPublisherForm } from "@/components/publisher/edit-publisher";

interface PublisherActionProps {
  publisher: Publisher;
}

function PublisherAction({ publisher }: PublisherActionProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          data-cy="publisher-action"
        >
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Publisher Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <EditPublisherForm action="Edit" publisher={publisher} />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <DeletePublisherModal id={publisher.id} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const publisherColumns: ColumnDef<any>[] = [
  {
    accessorKey: "user.first_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Publisher Name" />
    ),
    cell: ({ row }) => {
      const user = row.original.user;
      return <div>{user?.first_name}</div>;
    },
  },
  {
    accessorKey: "tenant.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Publisher Organization" />
    ),
    cell: ({ row }) => {
      const tenant = row.original.tenant;
      return <div>{tenant?.name}</div>;
    },
  },
  {
    accessorKey: "custom_domain",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Custom Domain" />
    ),
    cell: ({ row }) => (
      <div className="max-w-xs truncate">{row.getValue("custom_domain")}</div>
    ),
  },
  {
    accessorKey: "slug",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Slug" />
    ),
    cell: ({ row }) => <div>{row.getValue("slug")}</div>,
  },
  {
    accessorKey: "bio",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Bio" />
    ),
    cell: ({ row }) => <div>{row.getValue("bio")}</div>,
  },
  {
    accessorKey: "profile_picture",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Profile Picture" />
    ),
    cell: ({ row }) => <div>{row.getValue("profile_picture")}</div>,
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <PublisherAction publisher={row.original} />,
  },
];
