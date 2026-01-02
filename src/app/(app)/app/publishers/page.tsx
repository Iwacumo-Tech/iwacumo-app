"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import PublisherForm from "@/components/publisher/publisher-form";
import { publisherColumns } from "@/components/publisher/columns";
import { DataTable } from "@/components/table/data-table";
import { useSession } from "next-auth/react";

export default function Page() {
  const session = useSession();
  const userRoles = session.data?.roles || [];
  
  const { data: allPublishers } = trpc.getAllPublisher.useQuery();
  const { data: userDetails } = trpc.getUserById.useQuery({
    id: session.data?.user.id as string,
  }, { enabled: !!session.data?.user.id });

  // Determine if user is restricted to a specific organization (Tenant Admin)
  const tenantSlug = userDetails?.claims.find(c => c.tenant_slug)?.tenant_slug;
  const isSuperAdmin = userRoles.some(r => r.name === "super-admin");

  const { data: orgPublishers } = trpc.getPublisherByOrganization.useQuery(
    { name: userDetails?.publisher?.tenant?.name || "" },
    { enabled: !isSuperAdmin && !!userDetails?.publisher?.tenant?.name }
  );

  const publishers = isSuperAdmin ? allPublishers : orgPublishers;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-xl">Publishers</h3>
        <p className="text-muted-foreground text-sm">
          {isSuperAdmin 
            ? "Global publisher management across all tenants" 
            : `Manage publishers under ${userDetails?.publisher?.tenant?.name || 'your organization'}`
          }
        </p>
      </div>
      <DataTable
        data={publishers ?? []}
        columns={publisherColumns}
        filterInputPlaceholder="Search by name or slug..."
        filterColumnId="name"
        action={<PublisherForm action="Add" />}
      />
    </div>
  );
}