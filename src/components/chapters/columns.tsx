import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Chapter } from "@prisma/client";

export const chapterColumns: ColumnDef<Chapter>[] = [
  {
    accessorKey: "serial_number",
    header: "S/N",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "chapter_number",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Chapter Number" />
    ),
    cell: ({ row }) => (
      <div className="max-w-xs truncate">Chapter {row.getValue("chapter_number")}</div>
    ),
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => <div>{row.getValue("title")}</div>,
  },

  {
    accessorKey: "summary",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Summary" />
    ),
    cell: ({ row }) => (
      <div className="max-w-xs truncate">{row.getValue("summary")}</div>
    ),
  },
  {
    accessorKey: "word_count",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Word Count" />
    ),
    cell: ({ row }) => (
      <div className="max-w-xs truncate">{row.getValue("word_count")}</div>
    ),
  },
];
