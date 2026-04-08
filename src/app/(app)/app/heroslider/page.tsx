"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { DataTable } from "@/components/table/data-table";
import { columns } from "@/components/slider/columns";
import HeroSlideForm from "@/components/slider/AddHeroSlider";
import { Loader2, LayoutTemplate } from "lucide-react";

export default function HeroSliderPage() {
  const { data: slides, isLoading } = trpc.getAllHeroSlides.useQuery();

  const globalCount = slides?.filter((s: any) => !s.tenant_id).length ?? 0;
  const tenantCount = slides?.filter((s: any) =>  s.tenant_id).length ?? 0;

  return (
    <div className="space-y-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-black pb-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Hero Slides<span className="text-accent">.</span>
          </h1>
          <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2 flex items-center gap-2">
            <LayoutTemplate size={14} />
            Manage homepage hero carousel slides
          </p>
        </div>
        <HeroSlideForm />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border-2 border-black p-5 border-l-[6px] border-l-accent bg-white">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">Global Slides</p>
          <p className="text-3xl font-black italic tracking-tighter">{globalCount}</p>
          <p className="text-[10px] font-bold opacity-40 mt-1">Shown on main shop</p>
        </div>
        <div className="border-2 border-black p-5 border-l-[6px] border-l-black bg-white">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">Publisher Slides</p>
          <p className="text-3xl font-black italic tracking-tighter">{tenantCount}</p>
          <p className="text-[10px] font-bold opacity-40 mt-1">Shown on storefronts</p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center gap-3 p-8 text-sm font-bold uppercase tracking-widest opacity-40">
          <Loader2 size={16} className="animate-spin" /> Loading slides...
        </div>
      ) : (
        <div className="bg-white border-4 border-black gumroad-shadow overflow-hidden">
          <DataTable
            columns={columns as any}
            data={slides ?? []}
            filterInputPlaceholder="Search by title..."
            filterColumnId="title"
          />
        </div>
      )}
    </div>
  );
}