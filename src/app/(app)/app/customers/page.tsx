"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { customerColumns } from "@/components/customers/columns";
import CustomerForm from "@/components/customers/customer-form";
import { DataTable } from "@/components/table/data-table";
import { useSession } from "next-auth/react";
import { Users, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomersPage() {
  const session = useSession();
  const userId = session.data?.user.id as string;

  // Fetching logic
  const { data: customers, isLoading } = trpc.getCustomersByUser.useQuery(
    { id: userId },
    { enabled: !!userId }
  );

  if (isLoading) {
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
            Customer Directory<span className="text-accent">.</span>
          </h1>
          <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2 flex items-center gap-2">
            <Users size={14} /> Total Lifetime Value — {customers?.length || 0} Profiles
          </p>
        </div>

        {/* <CustomerForm 
          action="Add" 
          trigger={
            <Button className="booka-button-primary h-14 px-8 text-sm">
              <UserPlus size={18} className="mr-2 stroke-[3px]" /> New Customer
            </Button>
          } 
        /> */}
      </div>

      <div className="bg-white border-4 border-black gumroad-shadow">
        <DataTable
          data={customers ?? []}
          columns={customerColumns}
          filterInputPlaceholder="Search by email or name..."
          filterColumnId="email" // FIX: Corrected from empty string
        />
      </div>
    </div>
  );
}