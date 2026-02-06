"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import Link from "next/link";
import { ArrowRight, Flame, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ProductCard from "@/components/shared/ProductCard";

export default function FeaturedSection({ title, filter, bgColor = "bg-background" }: any) {
  const { data: books, isLoading } = trpc.getAllBooks.useQuery();

  const getFilteredBooks = () => {
    if (!books) return [];
    let result = [...books];

    if (filter === "featured") {
      result = result.filter(b => b.featured);
    } else if (filter === "trending") {
      // Logic for sorting by sales (requires salesCount in schema/query)
      result = result.sort((a, b) => (b as any).salesCount - (a as any).salesCount);
    }

    // Since it's a scroller, we can show more than 4 items (e.g., top 8)
    return result.slice(0, 8);
  };

  const filteredBooks = getFilteredBooks();

  return (
    <section className={cn("py-16 border-b-[1.5px] border-black relative overflow-hidden", bgColor)}>
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        
        {/* Header Area - Tightened */}
        <div className="flex justify-between items-end mb-10">
          <div className="space-y-1">
            {filter === "trending" && (
              <div className="inline-flex items-center gap-1.5 bg-accent text-primary font-black px-2.5 py-0.5 text-[9px] uppercase italic border-[1.5px] border-black gumroad-shadow-sm mb-2">
                <Flame size={10} className="fill-primary" /> Hot This Week
              </div>
            )}
            <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-black">
              {title}<span className="text-accent">.</span>
            </h2>
          </div>
          
          <Link href="/shop" className="group flex items-center gap-2 font-black uppercase text-[11px] tracking-widest border-b-[1.5px] border-black pb-1 hover:text-accent hover:border-accent transition-colors">
            View All <ArrowRight className="h-3 w-3 group-hover:translate-x-1.5 transition-transform" />
          </Link>
        </div>

        {/* --- HORIZONTAL SCROLL CONTAINER --- */}
        <div className="relative">
          <div className={cn(
            "flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory no-scrollbar scroll-smooth",
            "px-1 -mx-1" // Prevents shadow clipping
          )}>
            {isLoading ? (
              [1, 2, 3, 4, 5].map(i => (
                <div 
                  key={i} 
                  className="w-[200px] md:w-[240px] shrink-0 aspect-[4/5] bg-gray-100 animate-pulse border-[1.5px] border-black rounded-[var(--radius)]" 
                />
              ))
            ) : filteredBooks.length > 0 ? (
              filteredBooks.map(book => (
                <div key={book.id} className="w-[200px] md:w-[240px] shrink-0 snap-start">
                  <ProductCard book={book} />
                </div>
              ))
            ) : (
              <div className="w-full py-16 border-[1.5px] border-dashed border-black/10 rounded-[var(--radius)] flex flex-col items-center justify-center">
                 <p className="font-black uppercase italic opacity-20 text-xl">Coming Soon</p>
              </div>
            )}
          </div>

          {/* Optional: Subtle Gradient Fades for Scroll Indication */}
          <div className="absolute top-0 right-0 h-full w-12 bg-gradient-to-l from-[#FAF9F6]/50 to-transparent pointer-events-none hidden md:block" />
        </div>
      </div>
    </section>
  );
}