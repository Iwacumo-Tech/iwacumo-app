"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { columns } from "@/components/customers/columns";
import CustomerForm from "@/components/customers/customer-form";
import { DataTable } from "@/components/table/data-table";
import { Customer } from "@prisma/client";
import { useSession } from "next-auth/react";

export default function Page () {
  const session = useSession();
  const { data: customers } = trpc.getCustomersByUser.useQuery({ id: session.data?.user.id as string });

  return (
    <>
      <div>
        <h3 className="font-bold text-lg">Customers</h3>
        <p className="mb-2">Create, see and manage Customers</p>
      </div>
      <DataTable
        data={customers ?? []}
        columns={columns}
        filterInputPlaceholder={""}
        filterColumnId={""}
        action={<CustomerForm customer={{} as Customer} action="Add" />}
      />
    </>
  );
}
