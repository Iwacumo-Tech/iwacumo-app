"use client";

import Link from "next/link";
import { trpc } from "@/app/_providers/trpc-provider";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export default function CategoryGrid() {
  // Fetch live categories from the backend
  const { data: categories, isLoading } = trpc.getCategories.useQuery();

  // Helper to rotate colors for that "Booka" aesthetic
  const getCategoryStyles = (index: number) => {
    const styles = [
      { bg: "bg-accent", text: "text-black" },       // Vibrant Sun
      { bg: "bg-white", text: "text-black" },        // Paper White
      { bg: "bg-primary", text: "text-white" },      // Lush Earth
    ];
    return styles[index % styles.length];
  };

  return (
    <section className="py-20 bg-[#FCFAEE] border-b-4 border-black">
      <div className="max-w-[90%] mx-auto">
        <h2 className="text-4xl md:text-5xl font-black uppercase italic mb-12 tracking-tighter">
          Browse by Genre<span className="text-primary">.</span>
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories?.map((cat, index) => {
              const theme = getCategoryStyles(index);
              return (
                <Link 
                  key={cat.id} 
                  href={`/shop?category=${cat.slug}`}
                  className={cn(
                    "group border-2 border-black p-8 flex items-center justify-center text-center transition-all",
                    "hover:gumroad-shadow hover:-translate-y-1 active:translate-y-0",
                    theme.bg,
                    theme.text
                  )}
                >
                  <span className="font-black uppercase text-sm tracking-widest group-hover:italic transition-all">
                    {cat.name}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}