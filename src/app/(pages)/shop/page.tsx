"use client";

import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/shared/ProductCard";
import { trpc } from "@/app/_providers/trpc-provider";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, ChevronLeft, Loader2, SearchX, Sparkles, ArrowRight } from "lucide-react";

// ─── Global Hero Carousel ─────────────────────────────────────────────────────

function GlobalHeroCarousel() {
  const { data: slides } = trpc.getGlobalHeroSlides.useQuery();
  const [current, setCurrent] = useState(0);

  if (!slides || slides.length === 0) return null;

  const prev = () => setCurrent(i => (i - 1 + slides.length) % slides.length);
  const next = () => setCurrent(i => (i + 1) % slides.length);
  const slide = slides[current];

  return (
    <section className="relative w-full overflow-hidden border-b-4 border-black" style={{ minHeight: 420 }}>
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src={slide.image}
          alt={slide.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[90%] mx-auto py-24 flex flex-col gap-6">
        <p className="text-accent text-[10px] font-black uppercase tracking-[0.3em]">{slide.subtitle}</p>
        <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter text-white leading-none max-w-2xl">
          {slide.title}
        </h2>
        <p className="text-white/70 font-bold text-sm max-w-lg">{slide.description}</p>
        <Link
          href={slide.buttonRoute}
          className="booka-button-primary h-14 px-10 text-sm inline-flex items-center gap-3 w-fit"
        >
          {slide.buttonText} <ArrowRight size={16} />
        </Link>
      </div>

      {/* Nav arrows */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 right-6 z-10 flex gap-2">
          <button onClick={prev} className="p-2 bg-white border-2 border-black hover:bg-accent transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button onClick={next} className="p-2 bg-white border-2 border-black hover:bg-accent transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                "w-2 h-2 border border-white transition-all",
                i === current ? "bg-accent" : "bg-white/30"
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Global Banner Strip ──────────────────────────────────────────────────────

function GlobalBannerStrip() {
  const { data: banners } = trpc.getGlobalBanners.useQuery();

  if (!banners || banners.length === 0) return null;

  return (
    <section className="border-b-4 border-black overflow-hidden">
      <div className="flex gap-0">
        {banners.map((banner) => (
          <div
            key={banner.id}
            className="relative flex-1 border-r-2 border-black last:border-r-0"
            style={{ minHeight: 120 }}
          >
            <Image
              src={banner.image}
              alt="Promotional banner"
              fill
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Shop Content ─────────────────────────────────────────────────────────────

function ShopContent() {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";
  const searchQuery = searchParams.get("q") || "";

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data: books, isLoading: booksLoading } = trpc.getAllBooks.useQuery();
  const { data: categories } = trpc.getCategories.useQuery();

  const filteredBooks = books?.filter((book: any) => {
    const matchesCategory = activeCategory === "all" ||
      book.categories?.some((cat: any) => cat.slug === activeCategory);
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === "" ||
      book.title.toLowerCase().includes(searchLower) ||
      book.author?.user?.first_name?.toLowerCase().includes(searchLower) ||
      book.author?.user?.last_name?.toLowerCase().includes(searchLower);
    return matchesCategory && matchesSearch;
  });

  const recommendedBooks = books
    ?.filter((b) => b.featured || b.published)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - clientWidth : scrollLeft + clientWidth,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]">

      {/* 1. Global Hero Carousel — replaces static hero when slides exist */}
      <GlobalHeroCarousel />

      {/* 2. Recommended carousel — only when not searching */}
      {!searchQuery && activeCategory === "all" && (
        <section className="bg-primary py-12 border-b-[1.5px] border-black relative overflow-hidden">
          <div className="max-w-[95%] lg:max-w-[90%] mx-auto mb-6 flex justify-between items-center px-4">
            <h2 className="text-white text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
              <Sparkles className="text-accent" size={24} /> Recommended For You
            </h2>
            <div className="flex gap-2">
              <button onClick={() => scroll("left")} className="p-2 bg-white border-[1.5px] border-black rounded-full hover:bg-accent transition-all active:translate-y-1">
                <ChevronLeft size={20} />
              </button>
              <button onClick={() => scroll("right")} className="p-2 bg-white border-[1.5px] border-black rounded-full hover:bg-accent transition-all active:translate-y-1">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          <div
            ref={scrollContainerRef}
            className="max-w-[95%] lg:max-w-[90%] mx-auto flex gap-6 overflow-x-auto px-4 pb-8 no-scrollbar scroll-smooth"
          >
            {recommendedBooks?.map((book) => (
              <div key={book.id} className="min-w-[220px] sm:min-w-[260px] lg:min-w-[280px]">
                <ProductCard book={book} variant="compact" />
              </div>
            ))}
          </div>
        </section>
      )}

      <main className="max-w-[95%] lg:max-w-[90%] mx-auto py-12 flex flex-col lg:flex-row gap-12 items-start px-4">

        {/* Sidebar */}
        <aside className="w-full lg:w-64 lg:sticky lg:top-28 space-y-6">
          <div className="bg-white border-[1.5px] border-black p-6 rounded-[var(--radius)] gumroad-shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 border-b pb-2">
              Filter By Genre
            </h3>
            <div className="flex flex-col gap-1">
              <CategoryLink name="All Library" slug="all" active={activeCategory === "all" && !searchQuery} />
              {categories?.map((cat) => (
                <CategoryLink key={cat.id} name={cat.name} slug={cat.slug} active={activeCategory === cat.slug} />
              ))}
            </div>
          </div>

          {searchQuery && (
            <Link href="/shop" className="block w-full py-4 bg-white border-[1.5px] border-black rounded-[var(--radius)] text-center text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all">
              Clear Search
            </Link>
          )}

          <div className="hidden lg:block p-6 bg-accent border-[1.5px] border-black rounded-[var(--radius)] gumroad-shadow-sm -rotate-1">
            <p className="font-black uppercase text-[10px] leading-tight">
              Supporting independent African voices since 2026.
            </p>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 space-y-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-[1.5px] border-black pb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">
                {searchQuery ? `Results for "${searchQuery}"` : activeCategory.replace("-", " ")}
                <span className="text-accent">.</span>
              </h1>
              <p className="font-bold text-[10px] uppercase opacity-50 mt-1 tracking-widest">
                {filteredBooks?.length || 0} Curated Titles Found
              </p>
            </div>
          </div>

          {/* 3. Global Banner Strip — between header and book grid */}
          <GlobalBannerStrip />

          <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-10">
            {booksLoading ? (
              [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="aspect-[3/4] bg-white border-[1.5px] border-black rounded-[var(--radius)] animate-pulse" />
              ))
            ) : filteredBooks?.length === 0 ? (
              <div className="col-span-full py-32 flex flex-col items-center justify-center border-2 border-dashed border-black/10 rounded-[var(--radius)]">
                <SearchX size={48} className="opacity-10 mb-4" />
                <p className="text-2xl font-black uppercase italic opacity-20">Empty Shelves.</p>
                <Link href="/shop" className="mt-4 text-[10px] font-black uppercase underline underline-offset-4">Reset Shop</Link>
              </div>
            ) : (
              filteredBooks?.map((book) => <ProductCard key={book.id} book={book} />)
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-primary mb-4" size={40} />
          <p className="font-black uppercase italic text-sm tracking-widest animate-pulse">Opening the Vault...</p>
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  );
}

function CategoryLink({ name, slug, active }: { name: string; slug: string; active: boolean }) {
  return (
    <Link
      href={slug === "all" ? "/shop" : `/shop?category=${slug}`}
      className={cn(
        "px-3 py-2.5 font-bold uppercase text-[11px] rounded-md transition-all flex justify-between items-center group",
        active ? "bg-accent text-black" : "hover:bg-gray-50 text-gray-500 hover:text-black"
      )}
    >
      {name}
      <span className={cn("h-1.5 w-1.5 rounded-full bg-black transition-transform", active ? "scale-100" : "scale-0 group-hover:scale-50")} />
    </Link>
  );
}