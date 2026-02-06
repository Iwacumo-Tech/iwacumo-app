"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import BookForm from "@/components/books/book-form";
import { Button } from "@/components/ui/button";
import { staffBookColumns, readerBookColumns } from "@/components/books/columns";
import { DataTable } from "@/components/table/data-table";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BooksPage() {
  const { data: session } = useSession();
  const userId = session?.user.id as string;
  const userRoles = session?.roles || [];

  // Determine Roles
  const isSuperAdmin = userRoles.some(r => r.name === "super-admin");
  const isPublisher = userRoles.some(r => r.name === "publisher");
  const isAuthor = userRoles.some(r => r.name === "author");
  const isCustomer = session?.user.isCustomer;

  const isStaff = isSuperAdmin || isPublisher || isAuthor;

  // Data Fetching
  const { data: authorBooks } = trpc.getBookByAuthor.useQuery({ id: userId }, { enabled: isAuthor || isPublisher });
  const { data: allBooks } = trpc.getAllBooks.useQuery(undefined, { enabled: isSuperAdmin });
  const { data: purchasedBooks } = trpc.getPurchasedBooksByCustomer.useQuery({ id: userId }, { enabled: isCustomer });

  const displayData = isSuperAdmin ? (allBooks || []) : (isAuthor || isPublisher) ? (authorBooks || []) : (purchasedBooks || []);
  const columns = isStaff ? staffBookColumns : readerBookColumns;

  return (
    <div className="space-y-10">
      {/* Gumroad Style Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            {isCustomer ? "My Library" : "Books"}<span className="text-accent">.</span>
          </h1>
          {/* <Tabs defaultValue="all" className="mt-4">
            <TabsList className="bg-transparent gap-4 p-0">
              <TabsTrigger value="all" className="rounded-full border-2 border-black font-bold uppercase text-[10px] data-[state=active]:bg-black data-[state=active]:text-white px-6">
                All {isCustomer ? "Owned" : "Books"}
              </TabsTrigger>
              {!isCustomer && (
                <TabsTrigger value="featured" className="rounded-full border-2 border-black font-bold uppercase text-[10px] data-[state=active]:bg-black data-[state=active]:text-white px-6">
                  Featured
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs> */}
        </div>

        {!isCustomer && (
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

      {/* Main Table Container */}
      <div className="bg-white border-4 border-black gumroad-shadow overflow-hidden">
        <DataTable
          data={displayData}
          columns={columns}
          filterInputPlaceholder="Search library by title..."
          filterColumnId="title"
          // Passing role info to columns meta
          meta={{ isSuperAdmin, isPublisher, isAuthor }}
        />
      </div>

      {/* Gumroad Totals Footer (Only for Staff) */}
      {!isCustomer && displayData.length > 0 && (
        <div className="bg-muted border-4 border-t-0 border-black p-4 flex justify-between items-center px-10">
          <span className="font-black uppercase italic text-xs">Total Catalog Value</span>
          <span className="font-black text-xl italic tracking-tight">
            ₦{displayData.reduce((acc, b) => acc + (b.price || 0), 0).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}