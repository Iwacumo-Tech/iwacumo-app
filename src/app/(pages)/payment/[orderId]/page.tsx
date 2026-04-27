"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/app/_providers/trpc-provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import {
  DEFAULT_PAYMENT_GATEWAY_SETTINGS,
  formatMoney,
  getGatewayDisplayName,
  normalizePaymentGatewaySettings,
} from "@/lib/payment-config";

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const orderId = params?.orderId as string;
  const reference = searchParams?.get("reference") || searchParams?.get("trxref");

  const [isProcessing, setIsProcessing] = useState(false);

  const { data: order, isLoading: orderLoading } = trpc.getOrderById.useQuery({ id: orderId });
  const { data: systemSettings } = trpc.getSystemSettings.useQuery();

  const paymentGatewaySettings = normalizePaymentGatewaySettings(
    (systemSettings as any)?.payment_gateway_settings ?? DEFAULT_PAYMENT_GATEWAY_SETTINGS
  );

  const initializePaymentMutation = trpc.initializePayment.useMutation({
    onSuccess: (data) => {
      if (data.authorization_url) window.location.href = data.authorization_url;
    },
    onError: (error) => {
      toast({ title: "Payment Error", variant: "destructive", description: error.message });
      setIsProcessing(false);
    },
  });

  const verifyPaymentMutation = trpc.verifyPayment.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Success!", description: "Payment verified." });
        router.push(`/orders/${orderId}?status=success`);
      }
    },
  });

  useEffect(() => {
    if (reference && orderId) {
      verifyPaymentMutation.mutate({ reference, order_id: orderId });
    }
  }, [reference, orderId, verifyPaymentMutation]);

  const checkoutCurrency = (order as any)?.checkout_currency || order?.currency || "NGN";
  const checkoutSubtotal = (order as any)?.checkout_subtotal_amount ?? order?.subtotal_amount ?? 0;
  const checkoutShipping = (order as any)?.checkout_shipping_amount ?? order?.shipping_amount ?? 0;
  const checkoutTotal = (order as any)?.checkout_total_amount ?? order?.total_amount ?? 0;
  const paymentGateway = (order as any)?.payment_gateway || null;
  const paymentGatewayLabel = paymentGateway
    ? getGatewayDisplayName(paymentGateway as any, paymentGatewaySettings)
    : "Configured Gateway";

  const handlePayNow = () => {
    if (!order || status !== "authenticated") return;
    setIsProcessing(true);
    initializePaymentMutation.mutate({
      order_id: orderId,
      email: session?.user?.email as string,
      payment_gateway: (order as any)?.payment_gateway || undefined,
    });
  };

  if (orderLoading || (reference && verifyPaymentMutation.isPending)) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#FCFAEE]">
        <div className="w-16 h-16 border-4 border-black border-t-accent animate-spin mb-6" />
        <p className="font-black uppercase italic text-2xl tracking-tighter">
          {reference ? "Verifying Transaction..." : "Preparing Secure Checkout..."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFAEE] py-12 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        <div className="bg-white border-4 border-black gumroad-shadow p-8 md:p-12 space-y-8 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/20 rotate-45 border-4 border-black/5" />

          <div className="space-y-2">
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">
              Final Step<span className="text-accent">.</span>
            </h1>
            <p className="font-bold text-xs uppercase opacity-40 tracking-widest">Order Reference: {order?.order_number}</p>
          </div>

          <div className="border-2 border-black bg-[#FCFAEE] px-4 py-3 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Payment Route</p>
            <p className="font-black uppercase italic text-lg">{paymentGatewayLabel}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
              {checkoutCurrency}
            </p>
          </div>

          <div className="space-y-4 py-6 border-y-2 border-black border-dashed">
            <div className="flex justify-between font-bold uppercase text-xs">
              <span>Item Total</span>
              <span>{formatMoney(checkoutSubtotal, checkoutCurrency)}</span>
            </div>
            <div className="flex justify-between font-bold uppercase text-xs">
              <span>Delivery</span>
              <span>{formatMoney(checkoutShipping, checkoutCurrency)}</span>
            </div>
            <div className="flex justify-between items-end pt-2">
              <span className="font-black uppercase text-sm">Amount Due</span>
              <span className="text-4xl font-black italic text-primary">
                {formatMoney(checkoutTotal, checkoutCurrency)}
              </span>
            </div>
            {(order as any)?.checkout_currency && (order as any)?.checkout_currency !== order?.currency && (
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-right">
                Base Order Total {formatMoney(order?.total_amount ?? 0, order?.currency || "NGN")}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <Button
              onClick={handlePayNow}
              disabled={isProcessing}
              className="w-full booka-button-primary h-20 text-2xl group"
            >
              {isProcessing ? "Redirecting..." : `Pay via ${paymentGatewayLabel}`}
              <ArrowRight className="ml-3 group-hover:translate-x-2 transition-transform" />
            </Button>

            <p className="text-center text-[10px] font-black uppercase opacity-40 flex items-center justify-center gap-2">
              <ShieldCheck size={14} /> Secured by Industry Standard Encryption
            </p>
          </div>

          <button
            onClick={() => router.push(`/orders/${orderId}`)}
            className="w-full text-center font-black uppercase text-[10px] tracking-widest hover:underline"
          >
            Cancel and Return to Order
          </button>
        </div>
      </div>
    </div>
  );
}
