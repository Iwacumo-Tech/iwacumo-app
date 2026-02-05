"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  action?: React.ReactNode;
  onRowClick?: (data: TData) => void;
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  nextPage?: () => Promise<void> | undefined;
  filterInputPlaceholder: string;
  filterColumnId: string;
  itemCypressTag?: string;
  meta?: any; // To pass role context (isSuperAdmin, etc.) to columns
}

export function DataTable<TData, TValue>({
  columns,
  data,
  nextPage,
  action,
  onRowClick,
  filterInputPlaceholder,
  filterColumnId,
  itemCypressTag,
  meta,
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data: data || [],
    columns,
    state: {
      columnFilters,
    },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(), // Enables search functionality
    meta: meta, // Access this in columns via table.options.meta
  });

  return (
    <div className="flex flex-col w-full bg-white">
      {/* Search & Actions Toolbar */}
      <div className="p-4 border-b-4 border-black">
        <DataTableToolbar
          filterColumnId={filterColumnId}
          placeholder={filterInputPlaceholder}
          table={table}
          action={action}
        />
      </div>

      {/* Table Body */}
      <div className="w-full max-h-[50rem] overflow-y-auto no-scrollbar">
        <Table className="border-collapse">
          <TableHeader className="bg-white sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b-4 border-black hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead 
                      className="text-[10px] font-black uppercase tracking-widest text-primary h-14 px-6" 
                      key={header.id}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-cy={itemCypressTag}
                  className={cn(
                    "border-b-2 border-black/10 last:border-0 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-accent/5"
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell className="px-6 py-4" key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center font-black uppercase italic opacity-20 text-lg"
                >
                  Empty Library.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t-4 border-black bg-white">
        <DataTablePagination table={table} loadMore={nextPage} />
      </div>
    </div>
  );
}