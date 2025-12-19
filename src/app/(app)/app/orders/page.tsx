"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { DataTable } from "@/components/table/data-table";
import { orderColumns } from "@/components/orders/order-columns";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function OrdersPage() {
  const session = useSession();
  const userId = session.data?.user.id as string;
  
  // Get current user to determine publisher
  const { data: user } = trpc.getUserById.useQuery(
    { id: userId },
    { enabled: !!userId }
  );

  const publisherId = user?.publisher?.id;
  
  // Check if user is super-admin
  const isSuperAdmin = session.data?.permissions?.some(
    (perm) => perm.name === "super-admin"
  ) || false;

  // Get all orders
  const { data: allOrders, isLoading: isLoadingOrders } = trpc.getAllOrders.useQuery();
  
  // Get orders needing shipping
  const { data: ordersNeedingShipping, isLoading: isLoadingShipping } = trpc.getOrdersNeedingShipping.useQuery(
    { publisher_id: publisherId },
    { enabled: !!publisherId }
  );

  // Filter orders by publisher if user is a publisher (but not super-admin)
  // Super-admins see all orders, publishers see only their orders
  const filteredAllOrders = isSuperAdmin
    ? allOrders // Super-admin sees all orders
    : publisherId
    ? allOrders?.filter((order) => order.publisher_id === publisherId)
    : allOrders; // If no publisher, show all (or could be filtered differently)

  if (isLoadingOrders) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Orders Management</h1>
        <p className="text-muted-foreground">View and manage customer orders</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="needs-shipping">
            Needs Shipping ({ordersNeedingShipping?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {filteredAllOrders && filteredAllOrders.length > 0 ? (
            <DataTable
              data={filteredAllOrders}
              columns={orderColumns}
              filterInputPlaceholder="Search by order number or customer name..."
              filterColumnId="order_number"
              action={null}
            />
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <p className="text-muted-foreground">
                No orders found.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="needs-shipping" className="mt-6">
          {ordersNeedingShipping && ordersNeedingShipping.length > 0 ? (
            <DataTable
              data={ordersNeedingShipping}
              columns={orderColumns}
              filterInputPlaceholder="Search by order number or customer name..."
              filterColumnId="order_number"
              action={null}
            />
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <p className="text-muted-foreground">
                No orders need shipping at this time.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

