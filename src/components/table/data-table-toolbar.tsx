"use client";

import { Input } from "@/components/ui/input";
import { Table } from "@tanstack/react-table";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  action: React.ReactNode;
  placeholder: string;
  filterColumnId: string;
}

export function DataTableToolbar<TData> ({ table, action, placeholder, filterColumnId }: DataTableToolbarProps<TData>) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex gap-3">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder={placeholder}
            value={(table.getColumn(filterColumnId)?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn(filterColumnId)?.setFilterValue(event.target.value)}
            className="h-8 w-[150px] lg:w-[250px]"
          />
        </div>
        <DataTableViewOptions table={table} />
      </div>
      {action}
    </div>
  );
}
