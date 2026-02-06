"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { useDebounce } from "@/hooks/use-debounce";
import { Loader2, Search, BookOpen, User } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function SearchOverlay({ query, isOpen, onClose }: { query: string; isOpen: boolean; onClose: () => void }) {
  const debouncedQuery = useDebounce(query, 300);
  
  const { data: results, isFetching } = trpc.searchEverything.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );

  if (!isOpen || query.length < 2) return null;

  return (
    <div className="absolute top-full left-0 w-full mt-2 bg-white border-[1.5px] border-black rounded-[var(--radius)] gumroad-shadow-sm overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
      <div className="p-2 max-h-[400px] overflow-y-auto">
        {isFetching ? (
          <div className="p-4 flex items-center justify-center gap-2 text-xs font-bold uppercase opacity-50">
            <Loader2 className="animate-spin" size={14} /> Searching Library...
          </div>
        ) : results && results.length > 0 ? (
          <div className="grid gap-1">
            {results.map((book) => (
              <Link
                key={book.id}
                href={`/book/${book.id}`}
                onClick={onClose}
                className="flex items-center gap-3 p-3 hover:bg-accent rounded-[calc(var(--radius)-4px)] transition-colors group"
              >
                <div className="w-10 h-12 bg-gray-100 border border-black/10 rounded-sm shrink-0 overflow-hidden">
                  {book.book_cover ? (
                    <img src={book.book_cover} className="w-full h-full object-cover" alt={book.title} />
                    ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/5">
                        <BookOpen size={16} className="opacity-20"/>
                    </div>
                    )}
                </div>
                <div className="flex flex-col">
                  <span className="font-black italic uppercase text-xs leading-tight line-clamp-1 group-hover:text-black">
                    {book.title}
                  </span>
                  <span className="text-[10px] font-bold uppercase opacity-50 flex items-center gap-1">
                    <User size={10} /> {book.author?.user?.first_name || "Unknown"}
                  </span>
                </div>
              </Link>
            ))}
            <Link 
                href={`/shop?q=${encodeURIComponent(query)}`}
                onClick={() => {
                    console.log("Navigating to:", query); // Debug log to see if click registers
                    onClose(); 
                }}
                className="p-4 text-center border-t-[1.5px] border-black text-[11px] font-black uppercase tracking-widest hover:bg-accent transition-colors block w-full bg-white relative z-[70]"
                >
                View all results for "{query}"
                </Link>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-xs font-black uppercase italic opacity-30">No books found.</p>
          </div>
        )}
      </div>
    </div>
  );
}