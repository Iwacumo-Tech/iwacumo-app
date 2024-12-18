"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { DataTable } from "@/components/table/data-table";
import { columns } from "@/components/bookslider/columns";
import BookSlideForm from "@/components/bookslider/AddBookSlider";

export default function Page() {
  const bookSlide = trpc.getAllBookSlides.useQuery();

  return (
    <>
      <>
        <div>
          <h3 className="font-bold text-lg">Book Slider</h3>
          <p className="mb-2">Create, see and manage book slider</p>
        </div>
        <DataTable
          data={bookSlide?.data ?? []}
          columns={columns}
          filterInputPlaceholder={""}
          filterColumnId={""}
          action={<BookSlideForm />}
        />
      </>
    </>
  );
}
