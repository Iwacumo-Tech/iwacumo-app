import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductCard from "@/components/shared/ProductCard";
import StoreHeroCarousel from "./_components/StoreHeroCarousel";
import { Star } from "lucide-react";
import Link from "next/link";

interface StorePageProps {
  params: { slug: string };
}

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = params;

  const store = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      publishers: {
        include: {
          books: {
            where: { published: true, deleted_at: null },
            include: { author: { include: { user: true } }, categories: true },
            orderBy: { published_at: "desc" },
          },
        },
      },
      banners:    { where: { isShow: true, deleted_at: null } },
      hero_slides: { where: { deleted_at: null } },
    },
  });

  if (!store) notFound();

  const isWhiteLabel   = store.publishers?.white_label ?? false;
  const storeSettings  = ((store as any).store_settings as Record<string, any> | null) ?? {};
  const accentColor    = (isWhiteLabel && store.brand_color)    ? store.brand_color    : "#FFD700";
  const secondaryColor = (isWhiteLabel && store.secondary_color) ? store.secondary_color : "#000000";

  // Hero slides: tenant-specific → fall back to global
  let heroSlides = store.hero_slides;
  if (heroSlides.length === 0) {
    heroSlides = await prisma.heroSlide.findMany({ where: { tenant_id: null, deleted_at: null } });
  }

  const books       = store.publishers?.books ?? [];
  const heroLayout  = storeSettings.heroLayout  ?? "split";
  const accentStyle = storeSettings.accentStyle ?? "bold";

  // Section visibility (only meaningful for white-label, default all true)
  const showFeatured    = isWhiteLabel ? (storeSettings.showFeatured    ?? true) : true;
  const showNewArrivals = isWhiteLabel ? (storeSettings.showNewArrivals ?? true) : true;
  const showCategories  = isWhiteLabel ? (storeSettings.showCategories  ?? true) : true;

  // Derived book lists
  const featuredBooks    = books.filter((b) => b.featured_shop);
  const newArrivalBooks  = books.slice(0, 8);  // newest first (ordered above)

  // All unique categories across the store's books
  const allCategories = showCategories
    ? Array.from(
        new Map(
          books.flatMap((b) => b.categories).map((c) => [c.id, c])
        ).values()
      )
    : [];

  // Marquee text
  const marqueeText = isWhiteLabel && (store as any).tagline
    ? (store as any).tagline
    : `Direct from ${store.name ?? "this store"}`;

  return (
    <main className="pb-20">
      {/* ── Hero carousel ── */}
      <StoreHeroCarousel
        slides={heroSlides}
        layout={heroLayout}
        accentColor={accentColor}
        secondaryColor={secondaryColor}
        accentStyle={accentStyle}
      />

      {/* ── Marquee strip ── */}
      <div
        className="py-3 overflow-hidden border-y-[1.5px]"
        style={{ background: secondaryColor, borderColor: secondaryColor, color: accentColor }}
      >
        <div className="flex items-center justify-center gap-12 whitespace-nowrap animate-marquee">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.25em]">
              <Star size={10} className="fill-current" style={{ color: accentColor }} />
              {marqueeText}
              <Star size={10} className="fill-current" style={{ color: accentColor }} />
              Secure Digital Library
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 md:px-12">

        {/* ── Featured Books (optional section) ── */}
        {showFeatured && featuredBooks.length > 0 && (
          <section className="py-16 lg:py-20">
            <SectionHeading
              title="Featured"
              subtitle={`${featuredBooks.length} Picks`}
              accentColor={accentColor}
              isWhiteLabel={isWhiteLabel}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
              {featuredBooks.map((book) => (
                <ProductCard key={book.id} book={book} />
              ))}
            </div>
          </section>
        )}

        {/* ── Browse by Category (optional section, white-label) ── */}
        {showCategories && allCategories.length > 0 && (
          <section className="py-10 border-t-[1.5px] border-black/10">
            <SectionHeading
              title="Browse by Category"
              subtitle={`${allCategories.length} Categories`}
              accentColor={accentColor}
              isWhiteLabel={isWhiteLabel}
            />
            <div className="flex flex-wrap gap-3">
              {allCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/${slug}?category=${cat.slug}`}
                  className="px-4 py-2 border-[1.5px] border-black text-[10px] font-black uppercase tracking-widest transition-all"
                  style={{ 
                    // We use a CSS variable for the hover color if it's dynamic
                    ['--hover-bg' as any]: secondaryColor,
                    ['--hover-text' as any]: accentColor 
                  }}
                  // Use Tailwind's hover: utilities or a global style
                  // To use the dynamic variables, you'd need a small CSS tweak:
                  // className="... hover:bg-[var(--hover-bg)] hover:text-[var(--hover-text)]"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── New Arrivals (optional section) ── */}
        {showNewArrivals && newArrivalBooks.length > 0 && showFeatured && featuredBooks.length > 0 && (
          <section className="py-16 border-t-[1.5px] border-black/10">
            <SectionHeading
              title="New Arrivals"
              subtitle="Just Added"
              accentColor={accentColor}
              isWhiteLabel={isWhiteLabel}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {newArrivalBooks.slice(0, 4).map((book) => (
                <ProductCard key={book.id} book={book} />
              ))}
            </div>
          </section>
        )}

        {/* ── Full Collection ── */}
        <section className="py-16 border-t-[1.5px] border-black/10">
          <div className="flex justify-between items-end mb-10 border-b-[1.5px] border-black pb-5">
            <div className="space-y-1">
              <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-black">
                The Collection<span style={{ color: accentColor }}>.</span>
              </h2>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">
                Curated Selection / {books.length} Titles
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: accentColor }} />
              <span className="text-[9px] font-black uppercase tracking-widest">Live Now</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
            {books.map((book) => (
              <ProductCard key={book.id} book={book} />
            ))}
          </div>

          {books.length === 0 && (
            <div className="py-32 flex flex-col items-center justify-center border-[1.5px] border-dashed border-black/10">
              <p className="font-black uppercase italic opacity-20 text-xl tracking-tighter">
                Library is being updated
              </p>
            </div>
          )}
        </section>

      </div>

      {/* ── Footer ── */}
      <footer className="max-w-[1440px] mx-auto px-6 md:px-12 pt-10 border-t-[1.5px] border-black flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          {!isWhiteLabel && (
            <Link href="/" className="text-[9px] font-black uppercase tracking-widest opacity-30">
              Built with Booka.
            </Link>
          )}
          <p className="text-[9px] font-black uppercase tracking-widest opacity-30">
            © {new Date().getFullYear()} {store.name}
          </p>
        </div>
        <div className="flex gap-6">
          <Link
            href={`/${slug}/contact`}
            className="text-[9px] font-black uppercase tracking-widest hover:opacity-70"
            style={{ color: "inherit" }}
          >
            Support
          </Link>
          <Link
            href={`/${slug}/terms`}
            className="text-[9px] font-black uppercase tracking-widest hover:opacity-70"
            style={{ color: "inherit" }}
          >
            Terms
          </Link>
        </div>
      </footer>
    </main>
  );
}

// ─── Section heading component (defined at module level — hard rule #4) ───────

function SectionHeading({
  title,
  subtitle,
  accentColor,
  isWhiteLabel,
}: {
  title: string;
  subtitle: string;
  accentColor: string;
  isWhiteLabel: boolean;
}) {
  return (
    <div className="flex justify-between items-end mb-10 border-b-[1.5px] border-black pb-5">
      <div className="space-y-1">
        <h2 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter text-black">
          {title}<span style={{ color: accentColor }}>.</span>
        </h2>
        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
}