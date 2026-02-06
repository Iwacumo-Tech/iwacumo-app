"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { MoveRight } from "lucide-react";

interface ProductCardProps {
  book: any;
  variant?: "default" | "compact";
}

export default function ProductCard({ book, variant = "default" }: ProductCardProps) {
  const authorName = book.author?.user 
    ? `${book.author.user.first_name} ${book.author.user.last_name || ""}`
    : book.author?.name || "Independent Author";

  const coverImage = book.book_cover || book.cover_image;

  return (
    <Link 
        href={`/shop/${book.id}`} 
        className={cn(
            "group bg-white border-[1.5px] border-black transition-all relative flex flex-col h-full",
            "rounded-[var(--radius)] overflow-hidden max-w-[280px] mx-auto w-full", // 🔥 Added a max-width to prevent stretching
            "hover:gumroad-shadow-sm hover:-translate-y-1 active:translate-y-0"
        )}
    >
      {/* Category Badge - Positioned tighter */}
      {book.categories?.[0] && (
        <span className="absolute top-2 left-2 z-10 bg-black text-accent px-2 py-0.5 text-[7px] font-black uppercase italic rounded-full border border-white/10">
          {book.categories[0].name}
        </span>
      )}

      {/* Book Cover Container - Reduced height and scale */}
      <div className={cn(
          "aspect-[4/5] border-b-[1.5px] border-black overflow-hidden bg-[#F4F4F4] relative", // 🔥 Changed from 3/4 to 4/5 for a shorter image
          variant === "compact" && "aspect-square" 
      )}>
        {coverImage ? (
          <img 
            src={coverImage} 
            alt={book.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/5 italic font-black text-primary/10 text-[8px] uppercase tracking-tighter">
            No Cover
          </div>
        )}
      </div>

      {/* Content Area - Significant padding reduction */}
      <div className="p-2.5 flex flex-col flex-1 bg-white"> 
        <h3 className="font-black uppercase text-[12px] leading-tight line-clamp-2 min-h-[2.4em] tracking-tight text-black">
          {book.title}
        </h3>
        
        <p className="text-[8px] font-bold text-gray-400 mt-0.5 uppercase tracking-widest truncate">
          {authorName}
        </p>
        
        <div className="mt-auto pt-2 flex justify-between items-center">
          {/* Price Tag - Smaller Sticker */}
          <div className="bg-accent px-2 py-0.5 rounded-full border-[1.5px] border-black font-black text-[10px] shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
            ₦{book.price?.toLocaleString() || "0"}
          </div>
          
          <span className="flex items-center gap-1 text-[7px] font-black uppercase opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
            Get <MoveRight size={8} />
          </span>
        </div>
      </div>
    </Link>
  );
}