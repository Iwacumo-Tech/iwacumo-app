"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/app/_providers/trpc-provider";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeliveryForm from "@/components/deliveries/delivery-form";
import { DataTable } from "@/components/table/data-table";
import { deliveryColumns } from "@/components/deliveries/delivery-columns";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, MapPin, User, Package, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Shared status config ──────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  pending:     "bg-yellow-400 text-black",
  captured:    "bg-green-500 text-white",
  paid:        "bg-green-500 text-white",
  fulfilled:   "bg-blue-500 text-white",
  cancelled:   "bg-red-500 text-white",
  refunded:    "bg-orange-500 text-white",
  failed:      "bg-red-500 text-white",
  draft:       "bg-gray-200 text-black",
  unfulfilled: "bg-gray-200 text-black",
  in_progress: "bg-yellow-400 text-black",
  shipped:     "bg-blue-400 text-white",
  delivered:   "bg-green-500 text-white",
};

const StatusBadge = ({ label, variant }: { label: string; variant: string }) => (
  <span className={cn(
    "px-3 py-1 border-2 border-black text-[10px] font-black uppercase italic leading-none inline-block",
    STATUS_COLORS[variant] ?? "bg-white text-black"
  )}>
    {label}
  </span>
);

// ── Order-level status options ────────────────────────────────
const ORDER_STATUS_OPTIONS = [
  { value: "pending",   label: "Pending"   },
  { value: "paid",      label: "Paid"      },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded",  label: "Refunded"  },
];

// ── Line-item fulfillment status options ──────────────────────
const FULFILLMENT_OPTIONS = [
  { value: "unfulfilled",  label: "Unfulfilled"  },
  { value: "in_progress",  label: "In Progress"  },
  { value: "shipped",      label: "Shipped"      },
  { value: "delivered",    label: "Delivered"    },
  { value: "cancelled",    label: "Cancelled"    },
];

// ── Line-item fulfillment status cell ─────────────────────────
function FulfillmentStatusCell({
  lineItemId,
  currentStatus,
  onSuccess,
}: {
  lineItemId: string;
  currentStatus: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  // updateOrderStatus can update fulfillment_status on line items via
  // the existing updateOrderStatus procedure when we pass it.
  // We use a direct Prisma update via a dedicated tRPC mutation.
  // Since updateOrderStatus only handles order-level fields, we need
  // the updateDeliveryTracking or a direct line-item update.
  // Looking at the schema: fulfillment_status lives on OrderLineItem.
  // We'll use the updateOrderStatus procedure's existing pattern and
  // add a fulfillment update — but since that procedure only takes
  // order-level status, we call cancelOrder as a workaround? No.
  // The correct call is a new procedure. For now we use updateOrderStatus
  // extended with line_item_id. Let's check what's available:
  // cancelOrder, updateOrderStatus — updateOrderStatus accepts:
  //   { id, status?, payment_status? }
  // We need line-item level. Use the existing updateDeliveryTracking
  // as a proxy? No — that's for DeliveryTracking, not OrderLineItem.
  //
  // Cleanest approach: call updateOrderStatus for order, and expose
  // a new tRPC procedure for line-item fulfillment. Since we want
  // no backend changes, we'll use a direct API call pattern.
  // Actually — updateOrderStatus exists and works. For line items
  // we'll add updateLineItemFulfillment to server/module/order.ts.
  // That's one new procedure. See INDEX_ADDITIONS below.

  const mutation = trpc.updateLineItemFulfillment.useMutation({
    onSuccess: () => {
      toast({ title: "Fulfillment status updated." });
      onSuccess();
    },
    onError: (err) =>
      toast({ variant: "destructive", title: "Failed", description: err.message }),
  });

  return (
    <Select
      value={currentStatus}
      onValueChange={(val) =>
        mutation.mutate({ line_item_id: lineItemId, fulfillment_status: val as any })
      }
      disabled={mutation.isPending}
    >
      <SelectTrigger className={cn(
        "h-8 w-36 rounded-none border-2 border-black text-[10px] font-black uppercase italic focus:ring-0",
        STATUS_COLORS[currentStatus] ? "" : ""
      )}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="!bg-white rounded-none border-2 border-black z-[50]">
        {FULFILLMENT_OPTIONS.map((opt) => (
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

// ── Page ──────────────────────────────────────────────────────
export default function AdminOrderDetailsPage() {
  const params  = useParams();
  const router  = useRouter();
  const { toast } = useToast();
  const orderId = params?.id as string;
  const utils   = trpc.useUtils();

  const { data: order, isLoading, isError } =
    trpc.getOrderById.useQuery({ id: orderId });

  const { data: deliveries } =
    trpc.getDeliveriesByOrder.useQuery(
      { order_id: orderId },
      { enabled: !!orderId }
    );

  // ── Order status update ───────────────────────────────────
  const updateStatusMutation = trpc.updateOrderStatus.useMutation({
    onSuccess: () => {
      utils.getOrderById.invalidate({ id: orderId });
      utils.getAllOrders.invalidate();
      toast({ title: "Order status updated." });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: "Failed", description: err.message }),
  });

  if (isLoading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="animate-spin opacity-20" />
    </div>
  );

  if (isError || !order) return (
    <div className="p-10 text-center space-y-4">
      <p className="font-black uppercase italic text-red-600">Order not found</p>
      <Button onClick={() => router.push("/app/orders")} className="booka-button-primary">
        Back to Orders
      </Button>
    </div>
  );

  // Parse delivery address from notes
  let deliveryAddress = null;
  if (order.notes) {
    try {
      const notesData = JSON.parse(order.notes);
      deliveryAddress = notesData.delivery_address || null;
    } catch { /* not JSON */ }
  }

  const hasPhysicalItems = order.line_items.some((item: any) => {
    const format = item.book_variant?.format?.toLowerCase() || "";
    return format === "paperback" || format === "hardcover";
  });

  const invalidateOrder = () => {
    utils.getOrderById.invalidate({ id: orderId });
    utils.getAllOrders.invalidate();
  };

  return (
    <div className="space-y-10">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-black pb-8">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push("/app/orders")}
            className="p-0 hover:bg-transparent font-black uppercase italic text-xs mb-4 flex items-center gap-2"
          >
            <ArrowLeft size={14} /> Back to Desk
          </Button>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Order #{order.order_number}
          </h1>
          <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2">
            {new Date(order.created_at).toLocaleDateString("en-GB", {
              day: "2-digit", month: "long", year: "numeric",
            })}
          </p>
        </div>

        {/* ── Status controls in header ─────────────────────── */}
        <div className="flex flex-col gap-3 items-end">
          {/* Payment status — read only (controlled by payment gateway) */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase opacity-40">Payment</span>
            <StatusBadge
              label={order.payment_status}
              variant={order.payment_status}
            />
          </div>

          {/* Order status — editable */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase opacity-40">Order Status</span>
            <Select
              value={order.status}
              onValueChange={(val) =>
                updateStatusMutation.mutate({ id: orderId, status: val as any })
              }
              disabled={updateStatusMutation.isPending}
            >
              <SelectTrigger className="h-10 w-44 rounded-none border-4 border-black font-black uppercase italic text-[11px] focus:ring-0 bg-white gumroad-shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="!bg-white rounded-none border-2 border-black z-[50]">
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
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-4 mb-8">
          <TabsTrigger
            value="overview"
            className="rounded-none border-4 border-black px-6 py-3 font-black uppercase italic data-[state=active]:bg-accent data-[state=active]:gumroad-shadow transition-all"
          >
            Receipt Overview
          </TabsTrigger>
          <TabsTrigger
            value="deliveries"
            className="rounded-none border-4 border-black px-6 py-3 font-black uppercase italic data-[state=active]:bg-accent data-[state=active]:gumroad-shadow transition-all"
          >
            Fulfillment ({deliveries?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* ── Overview tab ─────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-10 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Line items table */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white border-4 border-black p-6 gumroad-shadow">
                <h3 className="font-black uppercase italic text-sm mb-6 flex items-center gap-2">
                  <Package size={16} /> Line Items
                </h3>
                <Table>
                  <TableHeader className="border-b-4 border-black">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-black text-[10px] uppercase">Product</TableHead>
                      <TableHead className="font-black text-[10px] uppercase">Qty</TableHead>
                      <TableHead className="font-black text-[10px] uppercase">Price</TableHead>
                      <TableHead className="font-black text-[10px] uppercase">Total</TableHead>
                      <TableHead className="font-black text-[10px] uppercase">Fulfillment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.line_items.map((item: any) => {
                      const isPhysical = ["paperback", "hardcover"].includes(
                        item.book_variant?.format?.toLowerCase() ?? ""
                      );
                      return (
                        <TableRow key={item.id} className="border-b-2 border-black/10">
                          <TableCell className="font-bold text-xs italic uppercase">
                            {item.book_variant?.book?.title}
                            <span className="block text-[10px] opacity-40 not-italic">
                              {item.book_variant?.format}
                            </span>
                          </TableCell>
                          <TableCell className="font-bold">x{item.quantity}</TableCell>
                          <TableCell className="font-bold text-xs text-nowrap">
                            ₦{item.unit_price.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-black text-nowrap">
                            ₦{item.total_price.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {isPhysical ? (
                              // Physical items get a fulfillment status select
                              <FulfillmentStatusCell
                                lineItemId={item.id}
                                currentStatus={item.fulfillment_status ?? "unfulfilled"}
                                onSuccess={invalidateOrder}
                              />
                            ) : (
                              // Digital items are auto-fulfilled on payment
                              <StatusBadge label="Digital — Auto" variant="fulfilled" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Grand total */}
                <div className="mt-6 pt-6 border-t-4 border-black space-y-2 text-right">
                  <div className="text-[10px] font-black uppercase opacity-40">Grand Total</div>
                  <div className="text-4xl font-black italic tracking-tighter">
                    ₦{order.total_amount.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer + delivery info */}
            <div className="space-y-8">
              <div className="bg-white border-4 border-black p-6 gumroad-shadow">
                <h3 className="font-black uppercase italic text-sm mb-4 flex items-center gap-2 border-b-2 border-black pb-2">
                  <User size={16} /> Customer
                </h3>
                <div className="space-y-1">
                  <div className="font-black uppercase text-xs">
                    {order.customer?.user?.first_name} {order.customer?.user?.last_name}
                  </div>
                  <div className="font-bold opacity-40 text-[10px] truncate">
                    {order.customer?.user?.email}
                  </div>
                </div>
              </div>

              {deliveryAddress && (
                <div className="bg-accent border-4 border-black p-6 gumroad-shadow">
                  <h3 className="font-black uppercase italic text-sm mb-4 flex items-center gap-2 border-b-2 border-black pb-2">
                    <MapPin size={16} /> Shipping Info
                  </h3>
                  <div className="text-xs font-bold uppercase space-y-2">
                    <p>{deliveryAddress.full_name}</p>
                    <p className="opacity-60">
                      {deliveryAddress.address_line1}, {deliveryAddress.city}
                    </p>
                    <p className="opacity-60">
                      {deliveryAddress.state}, {deliveryAddress.country}
                    </p>
                    <p className="bg-black text-white px-2 py-1 inline-block text-[10px]">
                      {deliveryAddress.phone_number}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Deliveries tab ────────────────────────────────── */}
        <TabsContent value="deliveries" className="space-y-6 mt-6">
          <div className="bg-white border-4 border-black gumroad-shadow">
            <div className="p-6 border-b-4 border-black flex justify-between items-center bg-white">
              <h3 className="font-black uppercase italic text-sm">Shipment Tracking</h3>
              {hasPhysicalItems && order.payment_status === "captured" && (
                <DeliveryForm
                  orderId={orderId}
                  orderLineItems={order.line_items}
                  onSuccess={() => {
                    utils.getDeliveriesByOrder.invalidate({ order_id: orderId });
                    utils.getOrderById.invalidate({ id: orderId });
                  }}
                />
              )}
            </div>
            <div className="p-0">
              {deliveries && deliveries.length > 0 ? (
                <DataTable
                  data={deliveries}
                  columns={deliveryColumns}
                  filterInputPlaceholder="Search tracking..."
                  filterColumnId="tracking_number"
                />
              ) : (
                <div className="p-12 text-center">
                  <p className="font-black uppercase italic opacity-20 text-lg">
                    No Deliveries Logged.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}