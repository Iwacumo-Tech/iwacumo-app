// revelation-main/src/app/(pages)/payment/verify/page.tsx

"use client";

import { useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";

function PaymentVerifyContent() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const verificationStarted = useRef(false);

  const orderId = searchParams?.get("order_id");
  const reference = searchParams?.get("reference") || searchParams?.get("trxref");

  // Call the augmented verifyPayment mutation
  const { mutate: verify } = trpc.verifyPayment.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        // Redirect to the new Success Page on successful verification
        router.replace(`/payment/success/${(data as any).orderId}`);
      } else {
        toast({
          variant: "destructive",
          title: "Payment Failed",
          description: "We could not verify your payment. Please contact support."
        });
        router.replace("/cart");
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Verification Error",
        description: error.message || "An error occurred during verification."
      });
      router.replace("/cart");
    }
  });

  useEffect(() => {
    // Prevent double-verification in strict mode
    if (orderId && reference && !verificationStarted.current) {
      verificationStarted.current = true;
      verify({ order_id: orderId, reference: reference });
    } else if (!orderId || !reference) {
      router.replace("/shop");
    }
  }, [orderId, reference, verify, router]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="border-4 border-black rounded-none gumroad-shadow">
        <CardContent className="pt-10 pb-10">
          <div className="flex flex-col items-center justify-center min-h-[200px]">
            <Loader2 className="h-12 w-12 animate-spin mb-6 text-black" />
            <h2 className="text-2xl font-black uppercase italic italic">Verifying Payment</h2>
            <p className="text-center font-bold text-gray-500 mt-2">
              Please do not refresh the page...
            </p>
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
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p className="text-center font-bold uppercase">Loading verification engine...</p>
        </div>
      </div>
    }>
      <PaymentVerifyContent />
    </Suspense>
  );
}