import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { BookSlide } from "@prisma/client";
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

// interface ActionProps {
//   BookSlide: BookSlide;
// }

function Action () {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            data-cy="hero-slide-action"
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Hero Slide actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export const columns: ColumnDef<BookSlide>[] = [
  {
    id: "title",
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => (
      <div className="py-0.5 text-sm font-medium select-none text-nowrap">
        {row.getValue("title")}
      </div>
    ),
  },
  {
    id: "price",
    accessorKey: "Price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price" />
    ),
    cell: ({ row }) => (
      <div className="py-0.5 text-sm font-medium select-none text-nowrap">
        {row.getValue("price")}
      </div>
    ),
  },
  {
    id: "description",
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => (
      <div className="py-0.5 text-sm font-medium select-none text-nowrap">
        {row.getValue("description")}
      </div>
    ),
  },
  {
    id: "image",
    accessorKey: "image",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Image URL" />
    ),
    cell: ({ row }) => (
      <div className="py-0.5 text-sm font-medium select-none text-nowrap">
        {row.getValue("image")}
      </div>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Actions" />
    ),
    cell: () => <Action  />,
  },
];
