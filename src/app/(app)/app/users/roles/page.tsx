"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { DataTable } from "@/components/table/data-table";
import { adminRoleColumns } from "@/components/admin/admin-role-columns";
import AssignRoleForm from "@/components/admin/assign-role-form";
import { useSession } from "next-auth/react";

export default function AdminRolesPage() {
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
        <h3 className="font-bold text-lg">Manage Staff Roles</h3>
        <p className="mb-2">Assign and manage roles for staff members</p>
      </div>
      <DataTable
        data={adminUsers ?? []}
        columns={adminRoleColumns}
        filterInputPlaceholder="Search by name or email..."
        filterColumnId="email"
        action={
          <AssignRoleForm />
        }
      />
    </>
  );
}

