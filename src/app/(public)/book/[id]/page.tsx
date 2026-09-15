"use client";

// src/app/(public)/book/[id]/page.tsx
// Public reader route — available to any logged-in customer who has
// purchased the book. Renders ViewBookPage (book-viewer.tsx) which
// handles the two reading modes:
//   A. PDF → watermarked secure download flow
//   B. DOCX/chapters → in-browser zen reader
//
// Offline: when the getBookById query fails (no network, SW api-cache
// miss) the page falls back to the IndexedDB download store so a
// downloaded book still opens instead of dead-ending on "not found".

import { useEffect, useState } from "react";
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

  const [offlineBook, setOfflineBook] = useState<any | null>(null);
  const [offlineChecked, setOfflineChecked] = useState(false);

  // Server data unavailable → check the download store before giving up
  useEffect(() => {
    if (!isError && book) return;
    if (offlineChecked || !id) return;

    let cancelled = false;
    import("@/lib/offline-manager")
      .then(({ getDownloadedBookMeta }) => getDownloadedBookMeta(id))
      .then((meta) => {
        if (cancelled) return;
        setOfflineBook(meta);
        setOfflineChecked(true);
      })
      .catch(() => {
        if (!cancelled) setOfflineChecked(true);
      });

    return () => { cancelled = true; };
  }, [isError, book, id, offlineChecked]);

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
    // Still checking the download store — brief spinner, never the
    // "not found" dead end before we've looked.
    if (!offlineChecked) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F6]">
          <Loader2 className="animate-spin mb-4 opacity-30" size={40} />
          <p className="font-black uppercase italic text-xs tracking-widest animate-pulse">
            Opening your book…
          </p>
        </div>
      );
    }

    if (offlineBook) {
      // Synthesize a reader-ready book record: downloads only exist for
      // chapter-based ebooks, so force the in-browser reader path. The
      // real chapter list and content come from IndexedDB inside the
      // reader. Preorder fields are neutralized — preorder books can
      // never be downloaded, so the wall can't legitimately apply here.
      const syntheticBook = {
        ...offlineBook,
        text_url: "offline-download",
        chapters: [],
        preorder_enabled: false,
        publication_date: null,
      };
      return <ViewBookPage book={syntheticBook} />;
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F6] p-6 text-center">
        <div className="w-16 h-16 bg-red-50 border-[1.5px] border-red-200 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-black uppercase italic mb-2">Book not found</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          This book isn&apos;t available or you may not have access to it.
        </p>
      </div>
    );
  }

  return <ViewBookPage book={book as any} />;
}
