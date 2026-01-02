"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import BookForm from "@/components/books/book-form";
import { bookColumns } from "@/components/books/columns";
import { DataTable } from "@/components/table/data-table";
import { Book } from "@prisma/client";
import { useSession } from "next-auth/react";

export default function Page() {
  const session = useSession();
  const userId = session.data?.user.id as string;
  const userRoles = session.data?.roles || [];

  const { data: myBooks } = trpc.getBookByAuthor.useQuery({ id: userId }, { enabled: !!userId });
  const { data: allBooks } = trpc.getAllBooks.useQuery(undefined, { enabled: userRoles.some(r => r.name === "super-admin") });
  const { data: purchasedBooks } = trpc.getPurchasedBooksByCustomer.useQuery({ id: userId }, { enabled: !!userId });

  const isCustomer = userRoles.some((role) => role.name === "customer");
  const isSuperAdmin = userRoles.some((role) => role.name === "super-admin");
  const isAuthorOrPublisher = userRoles.some(r => r.name === "author" || r.name === "publisher");

  let displayData: any[] = [];
  let pageTitle = "Books";
  let pageDesc = "View and manage catalog items";
  let showAdd = false;

  if (isSuperAdmin) {
    displayData = allBooks || [];
    showAdd = true;
  } else if (isAuthorOrPublisher) {
    displayData = myBooks || [];
    showAdd = true;
  } else if (isCustomer) {
    displayData = purchasedBooks || [];
    pageTitle = "My Library";
    pageDesc = "Books you own and can read";
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-xl">{pageTitle}</h3>
        <p className="text-muted-foreground text-sm">{pageDesc}</p>
      </div>
      <DataTable
        data={displayData}
        columns={bookColumns}
        filterInputPlaceholder="Search by title..."
        filterColumnId="title"
        action={showAdd ? <BookForm book={{} as Book} action="Add" /> : null}
      />
    </div>
  );
}