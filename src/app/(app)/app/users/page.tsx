"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { DataTable } from "@/components/table/data-table";
import { columns } from "@/components/user/columns";
import UserForm from "@/components/user/user-form";
import { User } from "@prisma/client";

export default function Page () {
  const userRecord = trpc.getAllUsers.useQuery();

  return (
    <>
      <>
        <div>
          <h3 className="font-bold text-lg">Users</h3>
          <p className="mb-2">Create, see and manage users</p>
        </div>
        <DataTable
          data={userRecord?.data ?? []}
          columns={columns}
          filterInputPlaceholder={""}
          filterColumnId={""}
          action={<UserForm user={{} as User} action="Add" />}
        />
      </>
    </>
  );
}
