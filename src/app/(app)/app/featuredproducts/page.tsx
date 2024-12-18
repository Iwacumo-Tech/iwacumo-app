"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { DataTable } from "@/components/table/data-table";
import { columns } from "@/components/featuredproducts/columns";
import AddFeaturedProduct from "@/components/featuredproducts/AddFeaturedProduct";

export default function Page() {
  const featuredProduct = trpc.getAllFeaturedProducts.useQuery();

  return (
    <>
      <>
        <div>
          <h3 className="font-bold text-lg">Featured Products</h3>
          <p className="mb-2">Create, see and manage featured products</p>
        </div>
        <DataTable
          data={featuredProduct?.data ?? []}
          columns={columns}
          filterInputPlaceholder={""}
          filterColumnId={""}
          action={<AddFeaturedProduct />}
        />
      </>
    </>
  );
}
