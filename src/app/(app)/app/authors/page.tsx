"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import AuthorForm from "@/components/author/author-form";
import { columns } from "@/components/author/columns";
import { DataTable } from "@/components/table/data-table";
import { Author } from "@prisma/client";
import { useSession } from "next-auth/react";

export default function Page () {
  const session = useSession();  const { data: authors } = trpc.getAuthorsByUser.useQuery({ id: session.data?.user.id as string });

  return (
    <>
      <div>
        <h3 className="font-bold text-lg">Authors</h3>
        <p className="mb-2">Create, see and manage Authors</p>
      </div>
      <DataTable
        data={authors ?? []}
        columns={columns}
        filterInputPlaceholder={""}
        filterColumnId={""}
        action={<AuthorForm author={{} as Author} action="Add" />}
      />
    </>
  );
}
