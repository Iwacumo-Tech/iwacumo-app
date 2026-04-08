"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { DataTable } from "@/components/table/data-table";
import { columns } from "@/components/banner/columns";
import CreateBannerForm from "@/components/banner/AddBanner";
import { Loader2, Image as ImageIcon } from "lucide-react";

export default function BannerPage() {
  const { data: banners, isLoading } = trpc.getAllBanners.useQuery();

  const globalCount  = banners?.filter((b: any) => !b.tenant_id).length ?? 0;
  const visibleCount = banners?.filter((b: any) => b.isShow).length ?? 0;

  return (
    <div className="space-y-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-black pb-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Banners<span className="text-accent">.</span>
          </h1>
          <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2 flex items-center gap-2">
            <ImageIcon size={14} />
            Manage promotional banner images
          </p>
        </div>
        <CreateBannerForm />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border-2 border-black p-5 border-l-[6px] border-l-accent bg-white">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">Global Banners</p>
          <p className="text-3xl font-black italic tracking-tighter">{globalCount}</p>
          <p className="text-[10px] font-bold opacity-40 mt-1">Shown on main shop</p>
        </div>
        <div className="border-2 border-black p-5 border-l-[6px] border-l-black bg-white">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">Currently Visible</p>
          <p className="text-3xl font-black italic tracking-tighter">{visibleCount}</p>
          <p className="text-[10px] font-bold opacity-40 mt-1">Across all scopes</p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center gap-3 p-8 text-sm font-bold uppercase tracking-widest opacity-40">
          <Loader2 size={16} className="animate-spin" /> Loading banners...
        </div>
      ) : (
        <div className="bg-white border-4 border-black gumroad-shadow overflow-hidden">
          <DataTable
            columns={columns as any}
            data={banners ?? []}
            filterInputPlaceholder="Search banners..."
            filterColumnId="image"
          />
        </div>
      )}
    </div>
  );
}