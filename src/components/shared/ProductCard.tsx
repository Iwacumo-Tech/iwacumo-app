"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { MoveRight } from "lucide-react";

interface ProductCardProps {
  book: any;
  variant?: "default" | "compact";
}

export default function ProductCard({ book, variant = "default" }: ProductCardProps) {
  // Robust name resolution based on our backend include fix
  const authorName = book.author?.user 
    ? `${book.author.user.first_name} ${book.author.user.last_name}`
    : book.author?.name || "Independent Author";

  return (
    <Link 
        href={`/shop/${book.id}`} 
        className={cn(
            "group bg-white border-[1.5px] border-black transition-all relative flex flex-col h-full",
            "rounded-[var(--radius)] overflow-hidden", // 🔥 Added rounding and overflow
            "hover:gumroad-shadow hover:-translate-y-1 active:translate-y-0"
        )}
    >
      {/* Category Badge - Curvier & Modern */}
      {book.categories?.[0] && (
        <span className="absolute top-3 left-3 z-10 bg-black text-accent px-2.5 py-1 text-[9px] font-black uppercase italic rounded-full border border-white/10">
          {book.categories[0].name}
        </span>
      )}

      {/* Book Cover Container */}
      <div className={cn(
          "aspect-[3/4] border-b-[1.5px] border-black overflow-hidden bg-[#F4F4F4] relative",
          variant === "compact" && "aspect-[4/5]"
      )}>
        {book.book_cover ? (
          <img 
            src={book.book_cover} 
            alt={book.title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/5 italic font-black text-primary/10 text-[10px] uppercase tracking-tighter">
            No Cover Art
          </div>
        )}
        
        {/* Hover Overlay Gradient */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col flex-1 bg-white">
        <h3 className="font-black uppercase text-[14px] leading-tight line-clamp-2 min-h-[2.4em] tracking-tight">
          {book.title}
        </h3>
        
        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest truncate">
          {authorName}
        </p>
        
        <div className="mt-auto pt-4 flex justify-between items-center">
          {/* Price Tag - Curvy Sticker Look */}
          <div className="bg-accent px-3 py-1 rounded-full border-[1.5px] border-black font-black text-[12px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            ₦{book.price?.toLocaleString() || "0"}
          </div>
          
          <span className="flex items-center gap-1 text-[9px] font-black uppercase opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
            Get <MoveRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}