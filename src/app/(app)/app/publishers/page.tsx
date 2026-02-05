"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import PublisherForm from "@/components/publisher/publisher-form";
import { publisherColumns } from "@/components/publisher/columns";
import { DataTable } from "@/components/table/data-table";
import { useSession } from "next-auth/react";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PublishersPage() {
  const { data: session } = useSession();
  const { data: publishers } = trpc.getAllPublisher.useQuery();
  
  const isSuperAdmin = session?.roles?.some(r => r.name === "super-admin");

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-black pb-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Publishers<span className="text-accent">.</span>
          </h1>
          <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2 flex items-center gap-2">
            <Building2 size={14} /> Total Entity Management — {publishers?.length || 0} Organizations
          </p>
        </div>
        
        {isSuperAdmin && (
          <PublisherForm 
            action="Add" 
            trigger={
              <Button className="booka-button-primary h-14 px-8 text-sm">
                <Plus size={18} className="mr-2 stroke-[3px]" /> New Publisher
              </Button>
            } 
          />
        )}
      </div>

      <div className="bg-white border-4 border-black gumroad-shadow">
        <DataTable
          data={publishers ?? []}
          columns={publisherColumns}
          filterInputPlaceholder="Search by organization or lead..."
          filterColumnId="tenant_name" // Ensure your data-table-toolbar maps this correctly
        />
      </div>
    </div>
  );
}