"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/app/_providers/trpc-provider";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeliveryForm from "@/components/deliveries/delivery-form";
import { DataTable } from "@/components/table/data-table";
import { deliveryColumns } from "@/components/deliveries/delivery-columns";
import { useState } from "react";
import { ArrowLeft, CreditCard, MapPin, User, Package, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Reusing our Sticker Badge logic for consistency
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
      "px-3 py-1 border-2 border-black text-[10px] font-black uppercase italic leading-none inline-block",
      colors[variant] || "bg-white text-black"
    )}>
      {label}
    </span>
  );
};

export default function AdminOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;
  const utils = trpc.useUtils();

  const { data: order, isLoading, isError } = trpc.getOrderById.useQuery({ id: orderId });
  const { data: deliveries } = trpc.getDeliveriesByOrder.useQuery({ order_id: orderId }, { enabled: !!orderId });

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin opacity-20" /></div>;

  if (isError || !order) return (
    <div className="p-10 text-center space-y-4">
      <p className="font-black uppercase italic text-red-600">Order not found</p>
      <Button onClick={() => router.push("/app/orders")} className="booka-button-primary">Back to Orders</Button>
    </div>
  );

  // Logic: Parse delivery address from notes
  let deliveryAddress = null;
  if (order.notes) {
    try {
      const notesData = JSON.parse(order.notes);
      deliveryAddress = notesData.delivery_address || null;
    } catch { /* Not JSON */ }
  }

  // Logic: Check for physical items
  const hasPhysicalItems = order.line_items.some((item) => {
    const format = item.book_variant?.format?.toLowerCase() || "";
    return format === "paperback" || format === "hardcover";
  });

  return (
    <div className="space-y-10">
      {/* Neo-brutalist Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-black pb-8">
        <div>
          <Button variant="ghost" onClick={() => router.push("/app/orders")} className="p-0 hover:bg-transparent font-black uppercase italic text-xs mb-4 flex items-center gap-2">
            <ArrowLeft size={14} /> Back to Desk
          </Button>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Order #{order.order_number}
          </h1>
          <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2">
            Transaction Date: {new Date(order.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <StatusBadge label={order.payment_status} variant={order.payment_status} />
          <StatusBadge label={order.status} variant={order.status} />
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-4 mb-8">
          <TabsTrigger value="overview" className="rounded-none border-4 border-black px-6 py-3 font-black uppercase italic data-[state=active]:bg-accent data-[state=active]:gumroad-shadow transition-all">
            Receipt Overview
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="rounded-none border-4 border-black px-6 py-3 font-black uppercase italic data-[state=active]:bg-accent data-[state=active]:gumroad-shadow transition-all">
            Fulfillment ({deliveries?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-10 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left: Financial Summary */}
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
                      <TableHead className="font-black text-[10px] uppercase text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.line_items.map((item) => (
                      <TableRow key={item.id} className="border-b-2 border-black/10">
                        <TableCell className="font-bold text-xs italic uppercase">
                          {item.book_variant?.book?.title}
                          <span className="block text-[10px] opacity-40 not-italic">{item.book_variant?.format}</span>
                        </TableCell>
                        <TableCell className="font-bold">x{item.quantity}</TableCell>
                        <TableCell className="font-bold text-xs text-nowrap">₦{item.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="font-black text-right text-nowrap">₦{item.total_price.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <div className="mt-6 pt-6 border-t-4 border-black space-y-2 text-right">
                  <div className="text-[10px] font-black uppercase opacity-40">Grand Total</div>
                  <div className="text-4xl font-black italic tracking-tighter">₦{order.total_amount.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Right: Meta Info */}
            <div className="space-y-8">
              {/* Customer Info */}
              <div className="bg-white border-4 border-black p-6 gumroad-shadow">
                <h3 className="font-black uppercase italic text-sm mb-4 flex items-center gap-2 border-b-2 border-black pb-2">
                  <User size={16} /> Customer
                </h3>
                <div className="space-y-1">
                  <div className="font-black uppercase text-xs">{order.customer?.user?.first_name} {order.customer?.user?.last_name}</div>
                  <div className="font-bold opacity-40 text-[10px] truncate">{order.customer?.user?.email}</div>
                </div>
              </div>

              {/* Delivery Info */}
              {deliveryAddress && (
                <div className="bg-accent border-4 border-black p-6 gumroad-shadow">
                  <h3 className="font-black uppercase italic text-sm mb-4 flex items-center gap-2 border-b-2 border-black pb-2">
                    <MapPin size={16} /> Shipping Info
                  </h3>
                  <div className="text-xs font-bold uppercase space-y-2">
                    <p>{deliveryAddress.full_name}</p>
                    <p className="opacity-60">{deliveryAddress.address_line1}, {deliveryAddress.city}</p>
                    <p className="opacity-60">{deliveryAddress.state}, {deliveryAddress.country}</p>
                    <p className="bg-black text-white px-2 py-1 inline-block text-[10px]">{deliveryAddress.phone_number}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

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
                  <p className="font-black uppercase italic opacity-20 text-lg">No Deliveries Logged.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}