"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import TenantForm from "@/components/tenant/TenantForm";
import { tenantColumns } from "@/components/tenant/columns";
import { DataTable } from "@/components/table/data-table";
import { Book } from "@prisma/client";
import { useSession } from "next-auth/react";

export default function Page() {
  const session = useSession();
  const { data: tenants } = trpc.getAllTenant.useQuery();

  return (
    <>
      <div>
        <h3 className="font-bold text-lg">Tenants</h3>
        <p className="mb-2">Create, see and manage Tenants</p>
      </div>
      <DataTable
        data={tenants ?? []}
        columns={tenantColumns}
        filterInputPlaceholder={""}
        filterColumnId={""}
        action={<TenantForm action="Add" />}
      />
    </>
  );
}
