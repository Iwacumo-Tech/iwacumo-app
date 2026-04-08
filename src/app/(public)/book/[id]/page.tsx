"use client";

// src/app/(public)/book/[id]/page.tsx
// Public reader route — available to any logged-in customer who has
// purchased the book. Renders ViewBookPage (book-viewer.tsx) which
// handles the two reading modes:
//   A. PDF → watermarked secure download flow
//   B. DOCX/chapters → in-browser zen reader

import { useParams } from "next/navigation";
import { trpc } from "@/app/_providers/trpc-provider";
import ViewBookPage from "@/components/books/book-viewer";
import { Loader2, AlertCircle } from "lucide-react";

export default function PublicBookReaderPage() {
  const params = useParams();
  const id     = params?.id as string;

  const { data: book, isLoading, isError } = trpc.getBookById.useQuery(
    { id },
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F6]">
        <Loader2 className="animate-spin mb-4 opacity-30" size={40} />
        <p className="font-black uppercase italic text-xs tracking-widest animate-pulse">
          Opening your book…
        </p>
      </div>
    );
  }

  if (isError || !book) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F6] p-6 text-center">
        <div className="w-16 h-16 bg-red-50 border-[1.5px] border-red-200 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-black uppercase italic mb-2">Book not found</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          This book isn't available or you may not have access to it.
        </p>
      </div>
    );
  }

  return <ViewBookPage book={book as any} />;
}