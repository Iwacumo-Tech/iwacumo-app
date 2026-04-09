"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { buildCustomerColumns } from "@/components/customers/columns";
import { DataTable } from "@/components/table/data-table";
import { useSession } from "next-auth/react";
import { Users, Loader2 } from "lucide-react";
import { useMemo } from "react";

export default function CustomersPage() {
  const { data: session } = useSession();
  const userId    = session?.user?.id as string;
  const userRoles = session?.roles ?? [];

  const isSuperAdmin = userRoles.some(r => r.name === "super-admin");
  const isAuthor     = userRoles.some(r => r.name === "author") &&
                       !userRoles.some(r => ["super-admin", "publisher", "staff-publisher", "staff-content", "staff-finance", "staff-basic"].includes(r.name));

  const { data: customers, isLoading } = trpc.getCustomersByUser.useQuery(
    { id: userId },
    { enabled: !!userId }
  );

  // Memoised so columns don't rebuild on every render
  const columns = useMemo(() => buildCustomerColumns(isAuthor), [isAuthor]);

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
          {isAuthor && (
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mt-1">
              {/* Contact details are restricted for authors */}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white border-4 border-black gumroad-shadow">
        <DataTable
          data={customers ?? []}
          columns={columns}
          filterInputPlaceholder={isAuthor ? "Search by name..." : "Search by email or name..."}
          filterColumnId={isAuthor ? "user.first_name" : "email"}
        />
      </div>
    </div>
  );
}