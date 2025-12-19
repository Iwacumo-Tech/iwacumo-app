import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { DeliveryTracking } from "@prisma/client";
// Simple date formatter
const formatDate = (date: Date | string | null): string => {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import DeliveryForm from "./delivery-form";

type DeliveryWithRelations = DeliveryTracking & {
  order: {
    order_number: string;
    line_items: Array<{
      book_variant: {
        book: {
          id: string;
          title: string;
          book_cover: string | null;
          cover_image_url: string | null;
        };
      };
    }>;
  };
  order_lineitem?: {
    book_variant: {
      book: {
        id: string;
        title: string;
        book_cover: string | null;
        cover_image_url: string | null;
      };
    };
  } | null;
};

export const deliveryColumns: ColumnDef<DeliveryWithRelations>[] = [
  {
    accessorKey: "order.order_number",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order Number" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.original.order.order_number}</div>
    ),
  },
  {
    accessorKey: "book",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Book" />
    ),
    cell: ({ row }) => {
      const delivery = row.original;
      const book = delivery.order_lineitem?.book_variant?.book || 
                   delivery.order.line_items[0]?.book_variant?.book;
      
      return (
        <div className="max-w-xs truncate">
          {book?.title || "N/A"}
        </div>
      );
    },
  },
  {
    accessorKey: "carrier",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Carrier" />
    ),
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("carrier")}</div>
    ),
  },
  {
    accessorKey: "tracking_number",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tracking Number" />
    ),
    cell: ({ row }) => {
      const trackingNumber = row.getValue("tracking_number") as string;
      const trackingUrl = row.original.tracking_url;
      
      return (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{trackingNumber}</span>
          {trackingUrl && (
            <Link href={trackingUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>
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
        pending: "bg-yellow-100 text-yellow-800",
        in_transit: "bg-blue-100 text-blue-800",
        out_for_delivery: "bg-purple-100 text-purple-800",
        delivered: "bg-green-100 text-green-800",
        delayed: "bg-orange-100 text-orange-800",
        failed: "bg-red-100 text-red-800",
      };
      
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
            statusColors[status] || "bg-gray-100 text-gray-800"
          }`}
        >
          {status.replace("_", " ")}
        </span>
      );
    },
  },
  {
    accessorKey: "estimated_delivery_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estimated Delivery" />
    ),
    cell: ({ row }) => {
      const date = row.original.estimated_delivery_at;
      return (
        <div className="text-sm">
          {formatDate(date)}
        </div>
      );
    },
  },
  {
    accessorKey: "shipped_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Shipped Date" />
    ),
    cell: ({ row }) => {
      const date = row.original.shipped_at;
      return (
        <div className="text-sm">
          {date ? formatDate(date) : "Not shipped"}
        </div>
      );
    },
  },
  {
    accessorKey: "delivered_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Delivered Date" />
    ),
    cell: ({ row }) => {
      const date = row.original.delivered_at;
      return (
        <div className="text-sm">
          {date ? formatDate(date) : "Not delivered"}
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
      const delivery = row.original;
      return (
        <DeliveryForm
          orderId={delivery.order_id}
          delivery={delivery}
          onSuccess={() => {
            // Invalidation handled in the form component
          }}
        />
      );
    },
  },
];

