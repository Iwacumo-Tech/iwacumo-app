"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/app/_providers/trpc-provider";
import BookForm from "@/components/books/book-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";

export default function EditBookPage() {
  const params = useParams();
  const id = params?.id as string;

  const { data: book, isLoading } = trpc.getBookById.useQuery(
    { id },
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-sm font-bold text-gray-500">Book not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/app/books">
          <Button variant="outline" size="sm" className="rounded-none border-2 border-black">
            <ChevronLeft size={16} className="mr-1" /> Back to Books
          </Button>
        </Link>
        <h1 className="text-3xl font-black uppercase italic">Edit Book</h1>
      </div>

      <BookForm action="Edit" book={book as any} />
    </div>
  );
}
