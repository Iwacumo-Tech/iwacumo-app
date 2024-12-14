"use client";

import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
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
import * as React from "react";
import clsx from "clsx";

interface DataTableProps<TData, TValue> {
  action: React.ReactNode;
  onRowClick?: (data: TData) => void;
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  nextPage?: () => Promise<void> | undefined;
  filterInputPlaceholder: string;
  filterColumnId: string;
  itemCypressTag?: string;
}

export function DataTable<TData, TValue> ({
  columns,
  data,
  nextPage,
  action,
  onRowClick,
  filterInputPlaceholder,
  filterColumnId,
  itemCypressTag,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    enableRowSelection: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <DataTableToolbar
        filterColumnId={filterColumnId}
        placeholder={filterInputPlaceholder}
        table={table}
        action={action}
      />
      <div className="rounded-md border w-full max-h-[45rem] overflow-y-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead className="text-sm tracking-tight py-0 h-11" key={header.id}>
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
            {table.getRowModel().rows?.length
              ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    data-cy={itemCypressTag}
                    className={clsx(onRowClick && "cursor-pointer")}
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {
                      row.getVisibleCells().map((cell) => (
                        <TableCell className="text-sm tracking-tight py-2.5" key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))
                    }
                  </TableRow>
                ))
              )
              : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                  No results.
                  </TableCell>
                </TableRow>
              )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} loadMore={nextPage} />
    </div>
  );
}
