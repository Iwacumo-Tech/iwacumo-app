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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeliveryForm from "@/components/deliveries/delivery-form";
import { DataTable } from "@/components/table/data-table";
import { deliveryColumns } from "@/components/deliveries/delivery-columns";
import { useState } from "react";

export default function AdminOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);

  const { data: order, isLoading, isError } = trpc.getOrderById.useQuery({
    id: orderId,
  });

  const { data: deliveries } = trpc.getDeliveriesByOrder.useQuery(
    { order_id: orderId },
    { enabled: !!orderId }
  );

  const utils = trpc.useUtils();

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
          <Button onClick={() => router.push("/app/orders")}>
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  // Parse delivery address from notes if available
  let deliveryAddress = null;
  if (order.notes) {
    try {
      const notesData = JSON.parse(order.notes);
      deliveryAddress = notesData.delivery_address || null;
    } catch {
      // Notes is not JSON, ignore
    }
  }

  // Check if order has physical items that need shipping
  const hasPhysicalItems = order.line_items.some((item) => {
    const format = item.book_variant?.format?.toLowerCase() || "";
    return format === "paperback" || format === "hardcover";
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/app/orders")}
          className="mb-4"
        >
          ← Back to Orders
        </Button>
        <h1 className="text-2xl font-bold">Order Details</h1>
        <p className="text-gray-500">Order Number: {order.order_number}</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deliveries">
            Deliveries ({deliveries?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <div className="font-semibold capitalize">{order.status}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Payment Status:</span>
                  <div className="font-semibold capitalize">{order.payment_status}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Subtotal:</span>
                  <div>₦{order.subtotal_amount.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Shipping:</span>
                  <div>₦{order.shipping_amount.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Tax:</span>
                  <div>₦{order.tax_amount.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Total:</span>
                  <div className="text-lg font-bold text-[#82d236]">
                    ₦{order.total_amount.toFixed(2)}
                  </div>
                </div>
              </div>
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
                    <TableHead>Fulfillment Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.line_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.book_variant?.book?.title || "Unknown Book"}
                      </TableCell>
                      <TableCell className="capitalize">
                        {item.book_variant?.format || "N/A"}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>₦{item.unit_price.toFixed(2)}</TableCell>
                      <TableCell>₦{item.total_price.toFixed(2)}</TableCell>
                      <TableCell className="capitalize">
                        {item.fulfillment_status}
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

          {/* Delivery Address */}
          {deliveryAddress && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div>
                    <span className="font-semibold">Name: </span>
                    {deliveryAddress.full_name}
                  </div>
                  <div>
                    <span className="font-semibold">Phone: </span>
                    {deliveryAddress.phone_number}
                  </div>
                  <div>
                    <span className="font-semibold">Email: </span>
                    {deliveryAddress.email}
                  </div>
                  <div>
                    <span className="font-semibold">Address: </span>
                    {deliveryAddress.address_line1}
                    {deliveryAddress.address_line2 && `, ${deliveryAddress.address_line2}`}
                  </div>
                  <div>
                    <span className="font-semibold">City: </span>
                    {deliveryAddress.city}
                  </div>
                  <div>
                    <span className="font-semibold">State: </span>
                    {deliveryAddress.state}
                  </div>
                  <div>
                    <span className="font-semibold">Postal Code: </span>
                    {deliveryAddress.postal_code}
                  </div>
                  <div>
                    <span className="font-semibold">Country: </span>
                    {deliveryAddress.country}
                  </div>
                  {deliveryAddress.delivery_instructions && (
                    <div>
                      <span className="font-semibold">Instructions: </span>
                      {deliveryAddress.delivery_instructions}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Delivery Tracking</CardTitle>
                {hasPhysicalItems && order.payment_status === "captured" && (
                  <DeliveryForm
                    orderId={orderId}
                    orderLineItems={order.line_items}
                    onSuccess={() => {
                      utils.getDeliveriesByOrder.invalidate({ order_id: orderId });
                      utils.getOrderById.invalidate({ id: orderId });
                      setShowDeliveryForm(false);
                    }}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {deliveries && deliveries.length > 0 ? (
                <DataTable
                  data={deliveries}
                  columns={deliveryColumns}
                  filterInputPlaceholder="Search by tracking number..."
                  filterColumnId="tracking_number"
                  action={null}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No delivery tracking records yet.
                  </p>
                  {hasPhysicalItems && order.payment_status === "captured" && (
                    <p className="text-sm text-muted-foreground">
                      Create a delivery tracking record to start shipping this order.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

