"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/app/_providers/trpc-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Clock, CreditCard, Package } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const orderId = params?.id as string;
  const reference = searchParams?.get("reference");

  const { data: order, isLoading, isError } = trpc.getOrderById.useQuery({ id: orderId });

  // Verification Logic for returns from Paystack
  const verifyPayment = trpc.verifyPayment.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Payment Successful", description: "Your order is now confirmed." });
        utils.getOrderById.invalidate({ id: orderId });
      }
    }
  });

  useEffect(() => {
    if (reference && orderId && order?.payment_status === "pending") {
      verifyPayment.mutate({ reference, order_id: orderId });
    }
  }, [reference, orderId, order?.payment_status]);

  if (isLoading || verifyPayment.isPending) {
    return (
      <div className="min-h-screen bg-[#FCFAEE] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-black border-t-accent animate-spin mb-4" />
        <p className="font-black uppercase italic tracking-tighter text-2xl">Updating Status...</p>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen bg-[#FCFAEE] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-black uppercase italic mb-4 tracking-tighter leading-none">Order Not Found<span className="text-accent">.</span></h1>
        <Button onClick={() => router.push("/shop")} className="booka-button-secondary">Back to Shop</Button>
      </div>
    );
  }

  const isPaid = order.payment_status === "captured";

  return (
    <div className="min-h-screen bg-[#FCFAEE] py-12 lg:py-20">
      <div className="max-w-[95%] lg:max-w-[85%] mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b-4 border-black pb-8">
          <div>
            <button onClick={() => router.push("/app")} className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest opacity-40 hover:opacity-100 mb-4 transition-all">
              <ArrowLeft size={14} /> My Dashboard
            </button>
            <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">Receipt<span className="text-accent">.</span></h1>
            <p className="font-bold text-sm opacity-60 mt-2 tracking-widest uppercase">Invoice #{order.order_number}</p>
          </div>
          <div className={cn("px-6 py-3 border-4 border-black font-black uppercase italic tracking-widest text-sm gumroad-shadow-sm", isPaid ? "bg-primary text-white" : "bg-accent text-black")}>
            {order.payment_status}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-12 items-start">
          {/* Main Invoice */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="rounded-none border-4 border-black bg-white gumroad-shadow">
              <CardHeader className="border-b-2 border-black bg-gray-50"><CardTitle className="font-black uppercase italic text-xl flex items-center gap-3"><Package className="text-primary" /> Items</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50 border-b-2 border-black">
                    <TableRow><TableHead className="font-black uppercase text-[10px] text-black">Title</TableHead><TableHead className="font-black uppercase text-[10px] text-black text-center">Qty</TableHead><TableHead className="font-black uppercase text-[10px] text-black text-right">Price</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.line_items.map((item) => (
                      <TableRow key={item.id} className="border-b border-black/5 last:border-0 hover:bg-accent/5 transition-colors">
                        <TableCell className="font-bold py-6">{item.book_variant?.book?.title || "Unknown Book"} <span className="block text-[8px] opacity-40 italic">{item.book_variant?.format}</span></TableCell>
                        <TableCell className="text-center font-bold">{item.quantity}</TableCell>
                        <TableCell className="text-right font-black italic">₦{item.total_price.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
               <div className="bg-white border-2 border-black p-6 gumroad-shadow-sm">
                  <h3 className="font-black uppercase italic text-xs mb-4 text-primary opacity-50">Recipient</h3>
                  <p className="font-black uppercase text-lg leading-none italic">{order.customer?.user?.first_name} {order.customer?.user?.last_name}</p>
                  <p className="text-[10px] font-bold mt-1 opacity-60">{order.customer?.user?.email}</p>
               </div>
               {(order as any).delivery_address && (
                  <div className="bg-white border-2 border-black p-6 gumroad-shadow-sm">
                    <h3 className="font-black uppercase italic text-xs mb-4 text-primary opacity-50">Shipping Destination</h3>
                    <p className="text-sm font-bold leading-relaxed uppercase">
                      {(order as any).delivery_address.street_address}, 
                      {(order as any).delivery_address.city}, 
                      {(order as any).delivery_address.state}
                    </p>
                    {((order as any).shipping_provider || (order as any).shipping_zone || (order as any).shipping_group) && (
                      <div className="mt-4 space-y-1">
                        {(order as any).shipping_provider && (
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                            Courier: {(order as any).shipping_provider}
                          </p>
                        )}
                        {(order as any).shipping_zone && (
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                            Zone: {(order as any).shipping_zone}
                          </p>
                        )}
                        {(order as any).shipping_group && (
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                            Group: {(order as any).shipping_group}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>

          {/* Sidebar Summary */}
          <aside className="lg:sticky lg:top-28 space-y-6">
            <Card className="rounded-none border-4 border-black bg-white gumroad-shadow p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between font-bold uppercase text-[10px] opacity-50"><span>Subtotal</span><span>₦{order.subtotal_amount.toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold uppercase text-[10px] opacity-50"><span>Shipping</span><span>₦{order.shipping_amount.toLocaleString()}</span></div>
                  <div className="pt-4 border-t-2 border-black flex justify-between items-end">
                    <span className="font-black uppercase text-xs">Total</span>
                    <span className="text-4xl font-black italic text-primary tracking-tighter">₦{order.total_amount.toLocaleString()}</span>
                  </div>
                </div>

                {!isPaid ? (
                  <div className="pt-6 space-y-4">
                    <Link href={`/payment/${order.id}`}><Button className="w-full booka-button-primary h-16 text-xl group italic">Complete Payment <CreditCard className="ml-3 group-hover:rotate-12" /></Button></Link>
                    <div className="flex items-center gap-2 justify-center text-[8px] font-black uppercase opacity-40 italic"><Clock size={10} /> Payment not yet captured</div>
                  </div>
                ) : (
                  <div className="pt-6 space-y-4">
                    <div className="bg-primary/5 border-2 border-primary p-4 text-center">
                        <CheckCircle2 className="mx-auto text-primary mb-2" />
                        <p className="text-primary font-black uppercase italic text-[10px] tracking-widest">Transaction Verified</p>
                    </div>
                  </div>
                )}
            </Card>
            <div className="p-6 bg-accent border-2 border-black text-[10px] font-black uppercase italic leading-tight -rotate-1">
                A confirmation email of your order has also been sent.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
