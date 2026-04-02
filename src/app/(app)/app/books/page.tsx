"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import BookForm from "@/components/books/book-form";
import { Button } from "@/components/ui/button";
import { staffBookColumns, readerBookColumns } from "@/components/books/columns";
import { DataTable } from "@/components/table/data-table";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";

export default function BooksPage() {
  const { data: session } = useSession();
  const userId    = session?.user.id as string;
  const userRoles = session?.roles || [];

  // ── Role flags ────────────────────────────────────────────────
  const isSuperAdmin = userRoles.some(r => r.name === "super-admin");
  const isPublisher  = userRoles.some(r => r.name === "publisher");
  const isAuthor     = userRoles.some(r => r.name === "author");
  const isCustomer   = session?.user.isCustomer;

  // Staff = anyone who manages books (not a pure reader)
  const isStaff = isSuperAdmin || isPublisher || isAuthor;

  // ── Data fetching — only fetch what the role needs ─────────────
  const { data: allBooks } = trpc.getAllBooks.useQuery(
    undefined,
    { enabled: isSuperAdmin }
  );

  const { data: authorBooks } = trpc.getBookByAuthor.useQuery(
    { id: userId },
    { enabled: (isAuthor || isPublisher) && !isSuperAdmin }
  );

  const { data: purchasedBooks } = trpc.getPurchasedBooksByCustomer.useQuery(
    { id: userId },
    { enabled: !!isCustomer && !isStaff }
  );

  // ── Display data resolution ───────────────────────────────────
  const displayData = isSuperAdmin
    ? (allBooks    ?? [])
    : (isAuthor || isPublisher)
    ? (authorBooks ?? [])
    : (purchasedBooks ?? []);

  // ── Column selection ──────────────────────────────────────────
  const columns = isStaff ? staffBookColumns : readerBookColumns;

  // ── Staff total value ─────────────────────────────────────────
  // Use lowest active variant list_price rather than the legacy
  // top-level price field, which may be stale or zero for variant-only books.
  const staffTotalValue = isStaff
    ? displayData.reduce((acc: number, b: any) => {
        const variants: any[] = b.variants ?? [];
        if (variants.length === 0) return acc + (b.price || 0);
        const lowestVariantPrice = Math.min(
          ...variants
            .filter((v: any) => v.status === "active" && v.list_price > 0)
            .map((v: any) => v.list_price)
        );
        return acc + (isFinite(lowestVariantPrice) ? lowestVariantPrice : b.price || 0);
      }, 0)
    : 0;

  return (
    <div className="space-y-10">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            {isCustomer && !isStaff ? "My Library" : "Books"}
            <span className="text-accent">.</span>
          </h1>
        </div>

        {isStaff && (
          <BookForm
            book={{} as any}
            action="Add"
            trigger={
              <Button className="booka-button-primary h-14 px-8 text-sm">
                <Plus size={18} className="mr-2 stroke-[3px]" /> New Book
              </Button>
            }
          />
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="bg-white border-4 border-black gumroad-shadow overflow-hidden">
        <DataTable
          data={displayData}
          columns={columns}
          filterInputPlaceholder={
            isCustomer && !isStaff
              ? "Search your library by title..."
              : "Search library by title..."
          }
          filterColumnId="title"
          // All three flags passed so columns can gate actions correctly
          meta={{ isSuperAdmin, isPublisher, isAuthor }}
        />
      </div>

      {/* ── Footer — staff only ─────────────────────────────── */}
      {isStaff && displayData.length > 0 && (
        <div className="bg-muted border-4 border-t-0 border-black p-4 flex justify-between items-center px-10">
          <span className="font-black uppercase italic text-xs">
            Total Catalog Value
            <span className="ml-2 font-normal normal-case opacity-40 text-[10px]">
              (lowest active variant price per book)
            </span>
          </span>
          <span className="font-black text-xl italic tracking-tight">
            ₦{staffTotalValue.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}