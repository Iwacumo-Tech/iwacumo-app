"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/app/_providers/trpc-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const session = useSession();
  const orderId = params?.orderId as string;
  const reference = searchParams?.get("reference");

  const [isProcessing, setIsProcessing] = useState(false);

  // Get order details
  const { data: order, isLoading: orderLoading } = trpc.getOrderById.useQuery({
    id: orderId,
  });

  // Initialize payment mutation
  const initializePaymentMutation = trpc.initializePayment.useMutation({
    onSuccess: (data) => {
      // Redirect to Paystack payment page
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    },
    onError: (error) => {
      toast({
        title: "Payment Error",
        variant: "destructive",
        description: error.message || "Failed to initialize payment",
      });
      setIsProcessing(false);
    },
  });

  // Verify payment mutation
  const verifyPaymentMutation = trpc.verifyPayment.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Payment Successful",
          variant: "default",
          description: "Your payment has been verified successfully",
        });
        // Redirect to order details page
        router.push(`/orders/${orderId}`);
      } else {
        toast({
          title: "Payment Failed",
          variant: "destructive",
          description: data.message || "Payment verification failed",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Verification Error",
        variant: "destructive",
        description: error.message || "Failed to verify payment",
      });
    },
  });

  // Handle payment initialization
  const handlePayNow = () => {
    if (!order) {
      toast({
        title: "Error",
        variant: "destructive",
        description: "Order not found",
      });
      return;
    }

    // Get email from session or order customer
    const userEmail = 
      session.data?.user?.email || 
      order.customer?.user?.email;

    if (!userEmail) {
      toast({
        title: "Error",
        variant: "destructive",
        description: "User email not found. Please ensure you are logged in.",
      });
      return;
    }

    // Check if session is still loading
    if (session.status === "loading") {
      toast({
        title: "Please wait",
        variant: "default",
        description: "Loading user information...",
      });
      return;
    }

    // Check if user is authenticated
    if (session.status === "unauthenticated") {
      toast({
        title: "Authentication Required",
        variant: "destructive",
        description: "Please log in to complete payment",
      });
      return;
    }

    setIsProcessing(true);
    initializePaymentMutation.mutate({
      order_id: orderId,
      email: userEmail,
      amount: order.total_amount,
      currency: order.currency || "NGN",
    });
  };

  // Verify payment if reference is present (callback from Paystack)
  useEffect(() => {
    if (reference && orderId && !verifyPaymentMutation.isPending) {
      verifyPaymentMutation.mutate({
        reference,
        order_id: orderId,
      });
    }
  }, [reference, orderId]);

  if (orderLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-red-500 mb-4">Order not found</p>
            <Button onClick={() => router.push("/shop")} className="w-full">
              Continue Shopping
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If payment is already captured, show success message
  if (order.payment_status === "captured") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Payment Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
              <p className="text-green-800 font-semibold text-center">
                ✓ Your payment has been processed successfully
              </p>
            </div>
            <div className="space-y-2 mb-6">
              <div className="flex justify-between">
                <span>Order Number:</span>
                <span className="font-semibold">{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <span className="font-semibold text-[#82d236]">
                  ₦{order.total_amount.toFixed(2)}
                </span>
              </div>
            </div>
            <Button
              onClick={() => router.push(`/orders/${orderId}`)}
              className="w-full bg-[#82d236] hover:bg-[#72bc2d]"
            >
              View Order Details
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If payment is pending and we have a reference, show verification status
  if (reference && verifyPaymentMutation.isPending) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="text-center">Verifying your payment...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show payment page
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Order Number:</span>
                <span className="font-semibold">{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₦{order.subtotal_amount.toFixed(2)}</span>
              </div>
              {order.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>₦{order.tax_amount.toFixed(2)}</span>
                </div>
              )}
              {order.shipping_amount > 0 && (
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span>₦{order.shipping_amount.toFixed(2)}</span>
                </div>
              )}
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-₦{order.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total Amount:</span>
                <span className="text-[#82d236]">
                  ₦{order.total_amount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method Info */}
            <div className="bg-gray-50 rounded-md p-4">
              <p className="text-sm text-gray-600 mb-2">
                You will be redirected to Paystack to complete your payment securely.
              </p>
              <p className="text-xs text-gray-500">
                We accept all major cards and bank transfers via Paystack.
              </p>
            </div>

            {/* Pay Button */}
            <Button
              onClick={handlePayNow}
              disabled={isProcessing || initializePaymentMutation.isPending}
              className="w-full bg-[#82d236] hover:bg-[#72bc2d] h-12 text-lg"
            >
              {isProcessing || initializePaymentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ₦${order.total_amount.toFixed(2)}`
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push(`/orders/${orderId}`)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

