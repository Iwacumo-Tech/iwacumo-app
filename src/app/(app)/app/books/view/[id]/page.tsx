"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { useParams } from "next/navigation";
import ViewBookPage from "@/components/books/book-viewer";
import { Loader2, AlertCircle } from "lucide-react";

const ChapterPage = () => {
  const params = useParams();
  const id = params?.id as string;
  
  const { data: singleBook, isLoading, isError } = trpc.getBookById.useQuery(
    { id: id },
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F6]">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="font-black uppercase italic text-xs tracking-widest animate-pulse">
          Opening the Vault...
        </p>
      </div>
    );
  }

  if (isError || !singleBook) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F6] p-6 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 border-[1.5px] border-red-200">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-2xl font-black uppercase italic mb-2">Access Denied</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          We couldn't retrieve this book. Please verify your purchase or internet connection.
        </p>
      </div>
    );
  }

  return <ViewBookPage book={singleBook} />;
};

export default ChapterPage;