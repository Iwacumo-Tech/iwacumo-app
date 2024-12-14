import { Button } from "@/components/ui/button";
import { Table } from "@tanstack/react-table";
import clsx from "clsx";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  loadMore?: () => Promise<void> | undefined;
}

export function DataTablePagination<TData> ({ table, loadMore }: DataTablePaginationProps<TData>) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className={clsx("flex-1 text-sm text-muted-foreground", !table.getFilteredSelectedRowModel().rows.length && "hidden")}>
        {
          !!table.getFilteredSelectedRowModel().rows.length && (
            <span>
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </span>
          )
        }
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <Button
            variant="link"
            className={clsx("py-0 h-auto", !loadMore && "hidden")}
            onClick={loadMore}
            disabled={!loadMore}
          >
            <span className="sr-only">Load more</span>
            <span className="text-sm text-nowrap">Load more...</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
