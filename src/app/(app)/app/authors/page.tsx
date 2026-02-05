"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import AuthorForm from "@/components/author/author-form";
import { authorColumns } from "@/components/author/columns";
import { DataTable } from "@/components/table/data-table";
import { useSession } from "next-auth/react";
import { Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthorsPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id as string;
  const userRoles = session?.roles || [];

  // Fetch authors specifically for this Publisher/User context
  const { data: authors, isLoading } = trpc.getAuthorsByUser.useQuery(
    { id: userId },
    { enabled: !!userId }
  );

  // Permission: Only Publishers can manage their roster
  const isPublisher = userRoles.some((r) => r.name === "publisher");

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-black pb-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Authors <span className="text-accent">.</span>
          </h1>
          <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2 flex items-center gap-2">
            <Users size={14} /> Organization Membership — {authors?.length || 0} Registered Writers
          </p>
        </div>

        {isPublisher && (
          <AuthorForm
            action="Add"
            trigger={
              <Button className="booka-button-primary h-14 px-8 text-sm">
                <UserPlus size={18} className="mr-2 stroke-[3px]" /> Recruit Author
              </Button>
            }
          />
        )}
      </div>

      {/* Data Table Section */}
      <div className="bg-white border-4 border-black gumroad-shadow">
        <DataTable
          data={authors ?? []}
          columns={authorColumns}
          filterInputPlaceholder="Search roster by name..."
          filterColumnId="name"
          itemCypressTag="author-row"
        />
      </div>
    </div>
  );
}