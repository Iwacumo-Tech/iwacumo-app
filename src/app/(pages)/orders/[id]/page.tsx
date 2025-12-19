"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/app/_providers/trpc-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const { data: order, isLoading, isError } = trpc.getOrderById.useQuery({
    id: orderId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading order details...</div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-500 mb-4">Order not found</p>
          <Button onClick={() => router.push("/shop")}>
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          ← Back
        </Button>
        <h1 className="text-2xl font-bold">Order Details</h1>
        <p className="text-gray-500">Order Number: {order.order_number}</p>
      </div>

      <div className="grid gap-6">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-semibold">{order.status}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Status:</span>
                <span className="font-semibold">{order.payment_status}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₦{order.subtotal_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>₦{order.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span>₦{order.shipping_amount.toFixed(2)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-₦{order.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-[#82d236]">
                  ₦{order.total_amount.toFixed(2)}
                </span>
              </div>
            </div>
            {/* Payment Button */}
            {order.payment_status === "pending" && order.status !== "cancelled" && (
              <div className="mt-6 pt-4 border-t">
                <Link href={`/payment/${order.id}`}>
                  <Button className="w-full bg-[#82d236] hover:bg-[#72bc2d]">
                    Pay Now - ₦{order.total_amount.toFixed(2)}
                  </Button>
                </Link>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Complete your payment to confirm your order
                </p>
              </div>
            )}
            {order.payment_status === "captured" && (
              <div className="mt-6 pt-4 border-t">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <p className="text-green-800 font-semibold text-center">
                    ✓ Payment Successful
                  </p>
                  <p className="text-sm text-green-600 text-center mt-1">
                    Your order is being processed
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.line_items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.book_variant?.book?.title || "Unknown Book"}
                    </TableCell>
                    <TableCell>{item.book_variant?.format || "N/A"}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>₦{item.unit_price.toFixed(2)}</TableCell>
                    <TableCell>₦{item.total_price.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className="text-sm">{item.fulfillment_status}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Customer Info */}
        {order.customer && (
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="font-semibold">Name: </span>
                  {order.customer.user?.first_name}{" "}
                  {order.customer.user?.last_name}
                </div>
                <div>
                  <span className="font-semibold">Email: </span>
                  {order.customer.user?.email}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

