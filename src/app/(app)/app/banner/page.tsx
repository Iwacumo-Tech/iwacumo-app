"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { DataTable } from "@/components/table/data-table";
import { columns } from "@/components/banner/columns";
import CreateBannerForm from "@/components/banner/AddBanner";

export default function Page() {
  const banners = trpc.getAllBanners.useQuery();

  return (
    <>
      <>
        <div>
          <h3 className="font-bold text-lg">Banner</h3>
          <p className="mb-2">Create, see and manage banner</p>
        </div>
        <DataTable
          data={banners?.data ?? []}
          columns={columns}
          filterInputPlaceholder={""}
          filterColumnId={""}
          action={<CreateBannerForm />}
        />
        ;
      </>
    </>
  );
}
