"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import PublisherForm from "@/components/publisher/publisher-form";
import { publisherColumns } from "@/components/publisher/columns";
import { DataTable } from "@/components/table/data-table";
import { Book } from "@prisma/client";
import { useSession } from "next-auth/react";

export default function Page() {
  const session = useSession();
  const { data: publishers } = trpc.getAllPublisher.useQuery();
  const { data: user } = trpc.getUserById.useQuery({
    id: session.data?.user.id as string,
  });
  const { data: NonBookaPublishers } = trpc.getPublisherByOrganization.useQuery(
    {
      name: user?.publisher?.tenant?.name as string,
    }
  );

  const filteredPublishers = user?.claims.some(
    (claim) => claim.tenant_slug !== "booka"
  )
    ? NonBookaPublishers
    : publishers;

  return (
    <>
      <div>
        <h3 className="font-bold text-lg">Publishers</h3>
        <p className="mb-2">Create, see and manage Publishers</p>
      </div>
      <DataTable
        data={filteredPublishers ?? []}
        columns={publisherColumns}
        filterInputPlaceholder={""}
        filterColumnId={""}
        action={<PublisherForm action="Add" />}
      />
    </>
  );
}
