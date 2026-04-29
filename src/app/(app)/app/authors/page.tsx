"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import AuthorForm from "@/components/author/author-form";
import { authorColumns } from "@/components/author/columns";
import { DataTable } from "@/components/table/data-table";
import { useSession } from "next-auth/react";
import { Users, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthorsPage() {
  const { data: session } = useSession();
  const userId   = session?.user?.id as string;
  const userRoles = session?.roles ?? [];

  const isSuperAdmin = userRoles.some(r => r.name === "super-admin");
  const isPublisher  = userRoles.some(r => r.name === "publisher");
  const isStaffRole = userRoles.some((r) => r.name === "tenant-admin" || r.name.startsWith("staff-"));
  const canAddAuthor = isPublisher || isSuperAdmin || (isStaffRole && !!session?.user?.publisher_id);

  // ── Super-admin uses getAllAuthors (no scoping) ───────────────────────────
  // Publisher / author uses getAuthorsByUser (scoped by their publisher_id).
  // Previously both paths called getAuthorsByUser — this was fine since
  // getAuthorsByUser handles super-admin god-mode server-side, but calling
  // getAllAuthors for super-admin is cleaner and more explicit.
  const { data: allAuthors, isLoading: loadingAll } = trpc.getAllAuthors.useQuery(
    undefined,
    { enabled: isSuperAdmin }
  );

  const { data: scopedAuthors, isLoading: loadingScoped } = trpc.getAuthorsByUser.useQuery(
    { id: userId },
    { enabled: !!userId && !isSuperAdmin }
  );

  const authors   = isSuperAdmin ? allAuthors : scopedAuthors;
  const isLoading = isSuperAdmin ? loadingAll : loadingScoped;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-black pb-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Authors<span className="text-accent">.</span>
          </h1>
          <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2 flex items-center gap-2">
            <Users size={14} />
            {isSuperAdmin ? "All Authors — Platform Wide" : "Your Roster"} — {authors?.length || 0} Registered Writers
          </p>
        </div>

        {canAddAuthor && (
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
