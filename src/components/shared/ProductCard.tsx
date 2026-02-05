import Link from "next/link";
import { cn } from "@/lib/utils";

interface ProductCardProps {
    book: any;
    variant?: "default" | "compact";
}

export default function ProductCard({ book, variant = "default" }: ProductCardProps) {
  return (
    <Link 
        href={`/shop/${book.id}`} 
        className={cn(
            "group bg-white border-2 border-black transition-all relative flex flex-col h-full",
            "hover:gumroad-shadow-sm hover:-translate-y-1 active:translate-y-0"
        )}
    >
      {/* Category Badge */}
      {book.categories?.[0] && (
        <span className="absolute top-2 left-2 z-10 bg-black text-white px-2 py-0.5 text-[8px] font-black uppercase italic border border-white/20">
          {book.categories[0].name}
        </span>
      )}

      {/* Book Cover */}
      <div className={cn(
          "aspect-[3/4] border-b-2 border-black overflow-hidden bg-[#eee]",
          variant === "compact" && "aspect-[4/5]"
      )}>
        {book.book_cover ? (
          <img 
            src={book.book_cover} 
            alt={book.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/5 italic font-black text-primary/20">NO COVER</div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-black uppercase text-[13px] leading-tight line-clamp-2 min-h-[2.2em]">
          {book.title}
        </h3>
        <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-wider">
          {book.author?.name}
        </p>
        
        <div className="mt-4 flex justify-between items-center">
          <div className="bg-accent px-2 py-0.5 border-2 border-black font-black text-[11px]">
            ₦{book.price?.toLocaleString()}
          </div>
          <span className="text-[8px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity">
            Buy →
          </span>
        </div>
      </div>
    </Link>
  );
}