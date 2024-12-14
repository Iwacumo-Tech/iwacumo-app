import { Author, Book, User } from "@prisma/client";
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
import DeleteAuthorModal from "./delete-author";
import AuthorForm from "./author-form";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";

interface ActionProps {
  author: Author;
}

function Action ({ author }: ActionProps) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            data-cy="author-action"
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Author actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <AuthorForm action="Edit" author={author} />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <DeleteAuthorModal id={author.id} />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export const columns: ColumnDef<Author & {user: User; books: Book[]}>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Author name" />
    ),
    cell: ({ row }) => (
      <div className="py-0.5 text-sm font-medium select-none text-nowrap">
        {`${row.original.user.first_name} ${row.original.user.last_name}`}
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
        {row.original.user.email}
      </div>
    ),
  },
  {
    id: "books",
    accessorKey: "books",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="No of Books" />
    ),
    cell: ({ row }) => (
      <div className="py-0.5 text-sm font-medium select-none text-nowrap">
        {row.original.books.length}
      </div>
    ),
  },

  {
    id: "actions",
    enableHiding: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Actions" />
    ),
    cell: ({ row }) => <Action author={row.original} />,
  },
];
