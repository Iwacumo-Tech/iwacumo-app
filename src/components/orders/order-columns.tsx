import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Order } from "@prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
// Simple date formatter
const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { 
    year: "numeric", 
    month: "short", 
    day: "numeric" 
  });
};

type OrderWithRelations = Order & {
  customer: {
    user: {
      first_name: string;
      email: string;
    } | null;
  } | null;
  publisher?: {
    id: string;
    slug: string | null;
    custom_domain: string | null;
  } | null;
  line_items: Array<{
    book_variant: {
      book: {
        title: string;
      } | null;
    } | null;
  }>;
  deliveries: Array<{
    id: string;
    status: string;
    tracking_number: string;
  }> | null;
};

export const orderColumns: ColumnDef<OrderWithRelations>[] = [
  {
    accessorKey: "order_number",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order Number" />
    ),
    cell: ({ row }) => (
      <div className="font-medium font-mono">{row.getValue("order_number")}</div>
    ),
  },
  {
    id: "customer",
    accessorFn: (row) => row.customer?.user?.first_name || "",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customer" />
    ),
    cell: ({ row }) => {
      const customer = row.original.customer;
      const user = customer?.user;
      if (!user) {
        return <div className="text-sm text-muted-foreground">N/A</div>;
      }
      return (
        <div>
          <div className="font-medium">{user.first_name || "N/A"}</div>
          <div className="text-sm text-muted-foreground">
            {user.email || "N/A"}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "line_items",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Items" />
    ),
    cell: ({ row }) => {
      const items = row.original.line_items || [];
      if (items.length === 0) {
        return <div className="text-sm text-muted-foreground">No items</div>;
      }
      return (
        <div className="max-w-xs">
          <div className="text-sm font-medium">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </div>
          <div className="text-xs text-muted-foreground line-clamp-2">
            {items
              .map((item) => item.book_variant?.book?.title || "Unknown")
              .join(", ")}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "total_amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total" />
    ),
    cell: ({ row }) => {
      const amount = row.getValue("total_amount") as number;
      const currency = row.original.currency || "NGN";
      return (
        <div className="font-medium">
          {currency === "NGN" ? "₦" : "$"}
          {amount.toFixed(2)}
        </div>
      );
    },
  },
  {
    accessorKey: "payment_status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payment" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("payment_status") as string;
      const statusColors: Record<string, string> = {
        pending: "bg-yellow-100 text-yellow-800",
        authorized: "bg-blue-100 text-blue-800",
        captured: "bg-green-100 text-green-800",
        refunded: "bg-orange-100 text-orange-800",
        failed: "bg-red-100 text-red-800",
      };
      
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
            statusColors[status] || "bg-gray-100 text-gray-800"
          }`}
        >
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const statusColors: Record<string, string> = {
        draft: "bg-gray-100 text-gray-800",
        pending: "bg-yellow-100 text-yellow-800",
        paid: "bg-green-100 text-green-800",
        fulfilled: "bg-blue-100 text-blue-800",
        cancelled: "bg-red-100 text-red-800",
        refunded: "bg-orange-100 text-orange-800",
      };
      
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
            statusColors[status] || "bg-gray-100 text-gray-800"
          }`}
        >
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: "deliveries",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Delivery" />
    ),
    cell: ({ row }) => {
      const deliveries = row.original.deliveries || [];
      if (deliveries.length === 0) {
        return <span className="text-sm text-muted-foreground">No tracking</span>;
      }
      
      const latestDelivery = deliveries[0];
      if (!latestDelivery) {
        return <span className="text-sm text-muted-foreground">No tracking</span>;
      }
      
      const statusColors: Record<string, string> = {
        pending: "bg-yellow-100 text-yellow-800",
        in_transit: "bg-blue-100 text-blue-800",
        out_for_delivery: "bg-purple-100 text-purple-800",
        delivered: "bg-green-100 text-green-800",
        delayed: "bg-orange-100 text-orange-800",
        failed: "bg-red-100 text-red-800",
      };
      
      return (
        <div className="space-y-1">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
              statusColors[latestDelivery.status] || "bg-gray-100 text-gray-800"
            }`}
          >
            {latestDelivery.status?.replace("_", " ") || "N/A"}
          </span>
          <div className="text-xs text-muted-foreground font-mono">
            {latestDelivery.tracking_number || "N/A"}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => {
      const date = row.original.created_at;
      return (
        <div className="text-sm">
          {formatDate(date)}
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
    cell: ({ row }) => {
      const order = row.original;
      return (
        <Link href={`/app/orders/${order.id}`}>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
        </Link>
      );
    },
  },
];

