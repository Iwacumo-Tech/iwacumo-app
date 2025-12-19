"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function PaymentVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams?.get("order_id");
  const reference = searchParams?.get("reference") || searchParams?.get("trxref");

  useEffect(() => {
    if (orderId && reference) {
      // Redirect to payment page with orderId and reference
      router.replace(`/payment/${orderId}?reference=${reference}`);
    } else if (orderId) {
      // If no reference, just redirect to order details
      router.replace(`/orders/${orderId}`);
    } else {
      // If no order_id, redirect to shop
      router.replace("/shop");
    }
  }, [orderId, reference, router]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center min-h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-center">Processing payment verification...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="text-center">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <PaymentVerifyContent />
    </Suspense>
  );
}

