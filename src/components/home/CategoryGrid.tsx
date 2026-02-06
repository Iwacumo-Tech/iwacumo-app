"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { trpc } from "@/app/_providers/trpc-provider";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles } from "lucide-react";

export default function CategoryGrid() {
  const { data: categories, isLoading } = trpc.getCategories.useQuery();

  // Refined Color Logic for the "Modern Organic" feel
  const getCategoryStyles = (index: number) => {
    const styles = [
      { bg: "bg-accent", text: "text-black", rotate: "-1deg" },   // Brand Yellow
      { bg: "bg-white", text: "text-black", rotate: "1deg" },     // Clean White
      { bg: "bg-black", text: "text-accent", rotate: "-1.5deg" }, // High Contrast
      { bg: "bg-[#F4F4F4]", text: "text-black", rotate: "0.5deg" }, // Soft Grey
    ];
    return styles[index % styles.length];
  };

  return (
    <section className="py-16 bg-[#FAF9F6] border-b-[1.5px] border-black overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        
        {/* Header - Tighter & Classier */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-accent bg-black w-fit px-2 py-0.5 rounded-full mb-2">
              <Sparkles size={10} /> Curated Collections
            </div>
            <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-black">
              Browse by Genre<span className="text-accent">.</span>
            </h2>
          </div>
          <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest md:mb-1">
            {categories?.length || 0} Categories Available
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin h-8 w-8 text-black" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-20">Organizing Library...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
            {categories?.map((cat, index) => {
              const theme = getCategoryStyles(index);
              return (
                <motion.div
                  key={cat.id}
                  whileHover={{ y: -5, rotate: "0deg", scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Link 
                    href={`/shop?category=${cat.slug}`}
                    className={cn(
                      "h-32 sm:h-40 flex flex-col items-center justify-center text-center p-6 transition-all",
                      "border-[1.5px] border-black rounded-[var(--radius)] gumroad-shadow-sm",
                      theme.bg,
                      theme.text
                    )}
                    style={{ transform: `rotate(${theme.rotate})` }}
                  >
                    <span className="font-black uppercase text-[11px] sm:text-xs tracking-tighter leading-tight group-hover:italic">
                      {cat.name}
                    </span>
                    <div className={cn(
                      "mt-3 w-6 h-0.5 opacity-20",
                      theme.text === "text-white" ? "bg-white" : "bg-black"
                    )} />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Made with Booka Label */}
        <div className="mt-16 flex justify-center">
          <div className="flex items-center gap-2 opacity-20">
            <div className="w-8 h-[1px] bg-black" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em]">Explore Africa</span>
            <div className="w-8 h-[1px] bg-black" />
          </div>
        </div>
      </div>
    </section>
  );
}