"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import TenantForm from "@/components/tenant/TenantForm";
import { tenantColumns } from "@/components/tenant/columns";
import { DataTable } from "@/components/table/data-table";
import { useSession } from "next-auth/react";

export default function Page() {
  const session = useSession();
  const { data: tenants, isLoading } = trpc.getAllTenant.useQuery();
  
  // Only Super Admins should manage top-level tenants
  const isSuperAdmin = session.data?.roles.some(r => r.name === "super-admin");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-xl">Tenants</h3>
        <p className="text-muted-foreground text-sm">Manage organizations and high-level platform instances</p>
      </div>
      
      <DataTable
        data={tenants ?? []}
        columns={tenantColumns}
        filterInputPlaceholder="Search tenants..."
        filterColumnId="name"
        action={isSuperAdmin ? <TenantForm action="Add" /> : null}
      />
    </div>
  );
}