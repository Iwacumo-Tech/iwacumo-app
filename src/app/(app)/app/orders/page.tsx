"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { DataTable } from "@/components/table/data-table";
import { orderColumns } from "@/components/orders/order-columns";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, PackageCheck, Loader2 } from "lucide-react";

export default function OrdersPage() {
  const session = useSession();
  const userId = session.data?.user.id as string;
  
  const { data: user } = trpc.getUserById.useQuery(
    { id: userId },
    { enabled: !!userId }
  );

  const publisherId = user?.publisher?.id;
  const isSuperAdmin = session.data?.permissions?.some(
    (perm) => perm.name === "super-admin"
  ) || false;

  const { data: allOrders, isLoading: isLoadingOrders } = trpc.getAllOrders.useQuery();
  const { data: ordersNeedingShipping } = trpc.getOrdersNeedingShipping.useQuery(
    { 
      user_id: session.data?.user?.id,
      publisher_id: publisherId // publisherId can be undefined for Super Admins
    },
    { 
      // Run the query if we have a user ID, regardless of whether a publisherId exists
      enabled: !!session.data?.user?.id
    }
  );

  const filteredAllOrders = isSuperAdmin
    ? allOrders 
    : publisherId
    ? allOrders?.filter((order) => order.publisher_id === publisherId)
    : allOrders;

  if (isLoadingOrders) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Neo-brutalist Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-black pb-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Order Desk<span className="text-accent">.</span>
          </h1>
          <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2 flex items-center gap-2">
            <ShoppingCart size={14} /> Global Commerce — {filteredAllOrders?.length || 0} Transactions
          </p>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-4 mb-8">
          <TabsTrigger 
            value="all" 
            className="rounded-none border-4 border-black px-6 py-3 font-black uppercase italic data-[state=active]:bg-accent data-[state=active]:gumroad-shadow transition-all"
          >
            All Orders
          </TabsTrigger>
          <TabsTrigger 
            value="needs-shipping"
            className="rounded-none border-4 border-black px-6 py-3 font-black uppercase italic data-[state=active]:bg-accent data-[state=active]:gumroad-shadow transition-all flex items-center gap-2"
          >
            Needs Shipping 
            <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded-full not-italic">
              {ordersNeedingShipping?.length || 0}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="bg-white border-4 border-black gumroad-shadow">
          <DataTable
            data={filteredAllOrders ?? []}
            columns={orderColumns}
            filterInputPlaceholder="Search by order number or customer..."
            filterColumnId="order_number"
          />
        </TabsContent>

        <TabsContent value="needs-shipping" className="bg-white border-4 border-black gumroad-shadow">
          <DataTable
            data={ordersNeedingShipping ?? []}
            columns={orderColumns}
            filterInputPlaceholder="Search shipping queue..."
            filterColumnId="order_number"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}