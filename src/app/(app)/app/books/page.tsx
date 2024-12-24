"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import BookForm from "@/components/books/book-form";
import { bookColumns } from "@/components/books/columns";
import { DataTable } from "@/components/table/data-table";
import { Book } from "@prisma/client";
import { useSession } from "next-auth/react";

export default function Page() {
  const session = useSession();
  const { data: books } = trpc.getBookByAuthor.useQuery({
    id: session.data?.user.id as string,
  });
  const { data: AllBooks } = trpc.getAllBooks.useQuery();
  const { data: user } = trpc.getUserById.useQuery({
    id: session.data?.user.id as string,
  });

  const filteredBooks = user?.claims.some(
    (claim) => claim.tenant_slug !== "booka"
  )
    ? books
    : AllBooks;

  return (
    <>
      <div>
        <h3 className="font-bold text-lg">Books</h3>
        <p className="mb-2">Create, see and manage Books</p>
      </div>
      <DataTable
        data={filteredBooks ?? []}
        columns={bookColumns}
        filterInputPlaceholder={""}
        filterColumnId={""}
        action={<BookForm book={{} as Book} action="Add" />}
      />
    </>
  );
}
