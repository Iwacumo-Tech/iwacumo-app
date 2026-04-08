"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";

// ── Status badge ──────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-400 text-black",
  captured:   "bg-green-500 text-white",
  paid:       "bg-green-500 text-white",
  fulfilled:  "bg-blue-500 text-white",
  cancelled:  "bg-red-500 text-white",
  refunded:   "bg-orange-500 text-white",
  failed:     "bg-red-500 text-white",
  draft:      "bg-gray-200 text-black",
  unfulfilled:"bg-gray-200 text-black",
  in_progress:"bg-yellow-400 text-black",
  shipped:    "bg-blue-400 text-white",
  delivered:  "bg-green-500 text-white",
};

export const StatusBadge = ({ label, variant }: { label: string; variant: string }) => (
  <span className={cn(
    "px-2 py-0.5 border-2 border-black text-[10px] font-black uppercase italic leading-none inline-block",
    STATUS_COLORS[variant] ?? "bg-white text-black"
  )}>
    {label}
  </span>
);

// ── Order status options (order.status field) ─────────────────
const ORDER_STATUS_OPTIONS = [
  { value: "pending",   label: "Pending"   },
  { value: "paid",      label: "Paid"      },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded",  label: "Refunded"  },
];

// ── Inline status updater cell ────────────────────────────────
function OrderStatusCell({ order }: { order: any }) {
  const { toast } = useToast();
  const utils     = trpc.useUtils();

  const mutation = trpc.updateOrderStatus.useMutation({
    onSuccess: () => {
      utils.getAllOrders.invalidate();
      toast({ title: "Status updated." });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: "Failed", description: err.message }),
  });

  // Only physical / paid orders make sense to update status on
  // Payment status controls are separate — we only touch order.status here
  return (
    <Select
      value={order.status}
      onValueChange={(val) =>
        mutation.mutate({ id: order.id, status: val as any })
      }
      disabled={mutation.isPending}
    >
      <SelectTrigger className="h-8 w-36 rounded-none border-2 border-black text-[10px] font-black uppercase italic focus:ring-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-white rounded-none border-2 border-black">
        {ORDER_STATUS_OPTIONS.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="text-[10px] font-black uppercase italic"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Column definitions ────────────────────────────────────────
export const orderColumns: ColumnDef<any>[] = [
  {
    accessorKey: "order_number",
    header: "Order #",
    cell: ({ row }) => (
      <div className="font-black font-mono text-xs uppercase">
        {row.getValue("order_number")}
      </div>
    ),
  },
  {
    id: "customer",
    header: "Customer",
    cell: ({ row }) => {
      const user = row.original.customer?.user;
      return (
        <div className="flex flex-col">
          <span className="font-black uppercase italic text-xs tracking-tight">
            {user?.first_name || "Guest"}
          </span>
          <span className="text-[10px] font-bold opacity-40 uppercase truncate max-w-[120px]">
            {user?.email}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "total_amount",
    header: "Total",
    cell: ({ row }) => {
      const amount   = row.getValue("total_amount") as number;
      const currency = row.original.currency || "NGN";
      return (
        <div className="font-black text-sm italic">
          {currency === "NGN" ? "₦" : "$"}{amount.toFixed(2)}
        </div>
      );
    },
  },
  {
    accessorKey: "payment_status",
    header: "Payment",
    cell: ({ row }) => (
      <StatusBadge
        label={row.getValue("payment_status")}
        variant={row.getValue("payment_status")}
      />
    ),
  },
  {
    accessorKey: "status",
    header: "Order Status",
    // Inline editable — shows a select instead of a static badge
    cell: ({ row }) => <OrderStatusCell order={row.original} />,
  },
  {
    accessorKey: "created_at",
    header: "Date",
    cell: ({ row }) => (
      <div className="text-[10px] font-bold uppercase opacity-60">
        {new Date(row.original.created_at).toLocaleDateString("en-GB", {
          day: "2-digit", month: "short", year: "numeric",
        })}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Link href={`/app/orders/${row.original.id}`}>
        <Button
          variant="outline"
          className="rounded-none border-2 border-black h-8 px-3 font-black uppercase italic text-[10px] hover:bg-accent transition-all"
        >
          <Eye className="h-3 w-3 mr-2" /> View
        </Button>
      </Link>
    ),
  },
];