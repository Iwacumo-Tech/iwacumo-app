"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { DataTable } from "@/components/table/data-table";
import { columns } from "@/components/slider/columns";
import HeroSlideForm from "@/components/slider/AddHeroSlider";

export default function Page () {
  const heroSlide = trpc.getAllHeroSlides.useQuery();

  return (
    <>
      <>
        <div>
          <h3 className="font-bold text-lg">Hero Slider</h3>
          <p className="mb-2">Create, see and manage hero slider</p>
        </div>

        <DataTable
          data={heroSlide?.data ?? []}
          columns={columns}
          filterInputPlaceholder={""}
          filterColumnId={""}
          action={<HeroSlideForm />}
        />
      </>
    </>
  );
}
