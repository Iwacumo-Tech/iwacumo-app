"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { customerColumns } from "@/components/customers/columns";
import { DataTable } from "@/components/table/data-table";
import { useSession } from "next-auth/react";
import { Users, Loader2 } from "lucide-react";

export default function CustomersPage() {
  const { data: session } = useSession();
  const userId    = session?.user?.id as string;
  const userRoles = session?.roles ?? [];

  const isSuperAdmin = userRoles.some(r => r.name === "super-admin");

  // getCustomersByUser already handles super-admin god-mode server-side
  // (returns all customers with full includes when the user has super-admin claim).
  // It also includes user: true on every path — which the columns require.
  // getAllCustomers was missing the include, causing blank rows for super-admin.
  // Simplest correct fix: use getCustomersByUser for all roles.
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
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-black pb-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Customer Directory<span className="text-accent">.</span>
          </h1>
          <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2 flex items-center gap-2">
            <Users size={14} />
            {isSuperAdmin ? "All Customers — Platform Wide" : "Your Customers"} — {customers?.length || 0} Profiles
          </p>
        </div>
      </div>

      <div className="bg-white border-4 border-black gumroad-shadow">
        <DataTable
          data={customers ?? []}
          columns={customerColumns}
          filterInputPlaceholder="Search by email or name..."
          filterColumnId="email"
        />
      </div>
    </div>
  );
}