"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import ProductCard from "@/components/shared/ProductCard";

export default function FeaturedSection({ title, filter, bgColor = "bg-background" }: any) {
  const { data: books, isLoading } = trpc.getAllBooks.useQuery();

  const getFilteredBooks = () => {
    if (!books) return [];

    let result = [...books];

    if (filter === "featured") {
      // 1. Manual Curation: Only show what Admin toggled
      result = result.filter(b => b.featured);
    } else if (filter === "trending") {
      // 2. Data-Driven: Sort by salesCount (captured payments)
      result = result.sort((a, b) => (b as any).salesCount - (a as any).salesCount);
    }

    // Always take the top 4
    return result.slice(0, 4);
  };

  const filteredBooks = getFilteredBooks();

  return (
    <section className={cn("py-20 border-b-4 border-black relative overflow-hidden", bgColor)}>
      <div className="max-w-[90%] mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div className="space-y-2">
            {filter === "trending" && (
              <div className="inline-flex items-center gap-2 bg-accent text-primary font-black px-3 py-1 text-[10px] uppercase italic border-2 border-black animate-bounce">
                <Flame size={12} className="fill-primary" /> Hot This Week
              </div>
            )}
            <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
              {title}<span className="text-accent">.</span>
            </h2>
          </div>
          
          <Link href="/shop" className="group flex items-center gap-2 font-black uppercase text-sm border-b-2 border-black pb-1 hover:text-accent hover:border-accent transition-colors">
            See All <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {isLoading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-[3/4] bg-gray-100 animate-pulse border-4 border-black gumroad-shadow" />
            ))
          ) : filteredBooks.length > 0 ? (
            filteredBooks.map(book => (
              <ProductCard key={book.id} book={book} />
            ))
          ) : (
            <div className="col-span-full py-20 border-4 border-dashed border-black/10 text-center">
               <p className="font-black uppercase italic opacity-20 text-2xl">Nothing to see here yet.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}