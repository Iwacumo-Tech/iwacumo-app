"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import AuthorForm from "@/components/author/author-form";
import { columns } from "@/components/author/columns";
import { DataTable } from "@/components/table/data-table";
import { Author } from "@prisma/client";
import { useSession } from "next-auth/react";

export default function Page () {
  const session = useSession();
  const { data: authors } = trpc.getAuthorsByUser.useQuery(
    { id: session.data?.user.id as string },
    { enabled: !!session.data?.user.id }
  );

  // Check if current user is a publisher (they are allowed to add authors)
  const isPublisher = session.data?.roles.some(r => r.name === "publisher");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-xl">Authors</h3>
        <p className="text-muted-foreground text-sm">Manage author profiles and roster</p>
      </div>
      <DataTable
        data={authors ?? []}
        columns={columns}
        filterInputPlaceholder="Search authors..."
        filterColumnId="name"
        action={isPublisher ? <AuthorForm author={{} as Author} action="Add" /> : null}
      />
    </div>
  );
}