import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductCard from "@/components/shared/ProductCard";
import StoreHeroCarousel from "./_components/StoreHeroCarousel"; 
import { Star } from "lucide-react";
import Link from "next/link";

export default async function StorePage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  // Fetch all store data in one server-side query
  const store = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      publishers: {
        include: {
          books: {
            where: { published: true, deleted_at: null },
            include: { author: { include: { user: true } }, categories: true }
          }
        }
      },
      banners: { where: { isShow: true, deleted_at: null } },
      hero_slides: { where: { deleted_at: null } }
    }
  });

  if (!store) notFound();

  // Logic: Use tenant slides or system defaults
  let heroSlides = store.hero_slides;
  if (heroSlides.length === 0) {
    heroSlides = await prisma.heroSlide.findMany({ 
      where: { tenant_id: null, deleted_at: null } 
    });
  }

  const books = store.publishers?.books || [];

  return (
    <main className="pb-20">
      {/* Interactive Carousel (Client) gets data from Page (Server) */}
      <StoreHeroCarousel slides={heroSlides} />

      <div className="bg-black text-white py-3 overflow-hidden border-y-[1.5px] border-black">
        <div className="flex items-center justify-center gap-12 whitespace-nowrap animate-marquee">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.25em]">
              <Star size={10} className="text-accent fill-accent" />
              Direct from {store.name}
              <Star size={10} className="text-accent fill-accent" />
              Secure Digital Library
            </div>
          ))}
        </div>
      </div>

      <section className="max-w-[1440px] mx-auto px-6 md:px-12 py-16 lg:py-24">
        <div className="flex justify-between items-end mb-10 border-b-[1.5px] border-black pb-5">
          <div className="space-y-1">
            <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-black">
              The Collection<span className="text-accent">.</span>
            </h2>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">
              Curated Selection / {books.length} Titles
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-1.5 w-1.5 bg-accent rounded-full animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest">Live Now</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
          {books.map((book) => (
            <ProductCard key={book.id} book={book} />
          ))}
        </div>

        {books.length === 0 && (
          <div className="py-32 flex flex-col items-center justify-center border-[1.5px] border-dashed border-black/10 rounded-[var(--radius)]">
            <p className="font-black uppercase italic opacity-20 text-xl tracking-tighter">Library is being updated</p>
          </div>
        )}
      </section>

      {/* Simplified Footer */}
      <footer className="max-w-[1440px] mx-auto px-6 md:px-12 pt-10 border-t-[1.5px] border-black flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
           <Link href="/" className="text-[9px] font-black uppercase tracking-widest opacity-30">Built with Booka.</Link>
           <p className="text-[9px] font-black uppercase tracking-widest opacity-30">© 2026 {store.name}</p>
        </div>
        <div className="flex gap-6">
          <Link href={`/${slug}/contact`} className="text-[9px] font-black uppercase tracking-widest hover:text-accent">Support</Link>
          <Link href={`/${slug}/terms`} className="text-[9px] font-black uppercase tracking-widest hover:text-accent">Terms</Link>
        </div>
      </footer>
    </main>
  );
}