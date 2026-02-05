import { ColumnDef } from "@tanstack/react-table";
import { Order } from "@prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

// Standard Status Badge styling
const StatusBadge = ({ label, variant }: { label: string, variant: string }) => {
  const colors: Record<string, string> = {
    pending: "bg-yellow-400 text-black",
    captured: "bg-green-500 text-white",
    paid: "bg-green-500 text-white",
    fulfilled: "bg-blue-500 text-white",
    cancelled: "bg-red-500 text-white",
    refunded: "bg-orange-500 text-white",
    failed: "bg-red-500 text-white",
    draft: "bg-gray-200 text-black",
  };

  return (
    <span className={cn(
      "px-2 py-0.5 border-2 border-black text-[10px] font-black uppercase italic leading-none inline-block",
      colors[variant] || "bg-white text-black"
    )}>
      {label}
    </span>
  );
};

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
      const amount = row.getValue("total_amount") as number;
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
    cell: ({ row }) => <StatusBadge label={row.getValue("payment_status")} variant={row.getValue("payment_status")} />
  },
  {
    accessorKey: "status",
    header: "Order Status",
    cell: ({ row }) => <StatusBadge label={row.getValue("status")} variant={row.getValue("status")} />
  },
  {
    accessorKey: "created_at",
    header: "Date",
    cell: ({ row }) => (
      <div className="text-[10px] font-bold uppercase opacity-60">
        {new Date(row.original.created_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        })}
      </div>
    )
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Link href={`/app/orders/${row.original.id}`}>
        <Button 
          variant="outline" 
          className="rounded-none border-2 border-black h-8 px-3 font-black uppercase italic text-[10px] hover:bg-accent transition-all"
        >
          <Eye className="h-3 w-3 mr-2" /> View Details
        </Button>
      </Link>
    ),
  },
];