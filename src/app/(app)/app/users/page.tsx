"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { DataTable } from "@/components/table/data-table";
import { adminColumns } from "@/components/admin/admin-columns";
import AdminUserForm from "@/components/admin/admin-user-form";
import { AdminUser } from "@prisma/client";
import { useSession } from "next-auth/react";

export default function Page() {
  const session = useSession();
  
  // Get current user to determine tenant
  const { data: currentUser } = trpc.getUserById.useQuery({
    id: session.data?.user.id as string,
  });

  // Get tenant_id from current user's publisher
  const tenantId = currentUser?.publisher?.tenant_id;

  // Fetch admin users for the current tenant
  const { data: adminUsers } = trpc.getAdminUsersByTenant.useQuery(
    { tenant_id: tenantId || "" },
    { enabled: !!tenantId }
  );

  return (
    <>
      <div>
        <h3 className="font-bold text-lg">Staff Members</h3>
        <p className="mb-2">Create, see and manage staff members of your organization</p>
      </div>
      <DataTable
        data={adminUsers ?? []}
        columns={adminColumns}
        filterInputPlaceholder="Search by name or email..."
        filterColumnId="email"
        action={
          <AdminUserForm
            adminUser={{} as AdminUser & { tenant?: { id: string; name: string | null } }}
            action="Add"
          />
        }
      />
    </>
  );
}
