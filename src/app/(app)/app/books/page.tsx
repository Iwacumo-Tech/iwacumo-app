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
  
  const { data: books } = trpc.getBookByAuthor.useQuery(
    { id: userId },
    { enabled: !!userId }
  );
  const { data: AllBooks } = trpc.getAllBooks.useQuery();
  const { data: purchasedBooks } = trpc.getPurchasedBooksByCustomer.useQuery(
    { id: userId },
    { enabled: !!userId }
  );
  const { data: user } = trpc.getUserById.useQuery(
    { id: userId },
    { enabled: !!userId }
  );

  // Check if user is a customer
  const isCustomer = session.data?.roles.some((role) => role.name === "customer");

  // Determine which books to display
  let filteredBooks: Book[] | undefined;
  let pageTitle = "Books";
  let pageDescription = "Create, see and manage Books";
  let showAddButton = true;

  if (isCustomer) {
    // For customers, show only purchased books
    filteredBooks = purchasedBooks;
    pageTitle = "My Books";
    pageDescription = "Books you have purchased";
    showAddButton = false;
  } else if (user?.claims.some((claim) => claim.tenant_slug !== "booka")) {
    // For non-booka tenants, show books by author/publisher
    filteredBooks = books;
  } else {
    // For booka or super-admin, show all books
    filteredBooks = AllBooks;
  }

  return (
    <>
      <div>
        <h3 className="font-bold text-lg">{pageTitle}</h3>
        <p className="mb-2">{pageDescription}</p>
      </div>
      <DataTable
        data={filteredBooks ?? []}
        columns={bookColumns}
        filterInputPlaceholder={""}
        filterColumnId={""}
        action={showAddButton ? <BookForm book={{} as Book} action="Add" /> : undefined}
      />
    </>
  );
}
