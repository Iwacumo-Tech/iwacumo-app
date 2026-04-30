import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductCard from "@/components/shared/ProductCard";
import StoreHeroCarousel from "./_components/StoreHeroCarousel";
import { Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { getStorefrontThemeTokens, normalizeStorefrontThemeSettings, withAlpha } from "@/lib/storefront-theme";

interface StorePageProps {
  params: { slug: string };
  searchParams?: { category?: string };
}

export default async function StorePage({ params, searchParams }: StorePageProps) {
  const { slug } = params;
  const selectedCategorySlug = searchParams?.category?.trim().toLowerCase() ?? "";

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
      banners: { where: { isShow: true, deleted_at: null } },
      hero_slides: { where: { deleted_at: null } },
    },
  });

  if (!store) notFound();

  const isWhiteLabel = store.publishers?.white_label ?? false;
  const storeSettings = normalizeStorefrontThemeSettings(((store as any).store_settings as Record<string, any> | null) ?? null);
  const accentColor = isWhiteLabel && store.brand_color ? store.brand_color : "#FFD700";
  const secondaryColor = isWhiteLabel && store.secondary_color ? store.secondary_color : "#000000";
  const themeTokens = getStorefrontThemeTokens({
    isWhiteLabel,
    accentColor,
    secondaryColor,
    settings: storeSettings,
  });

  let heroSlides = store.hero_slides;
  if (heroSlides.length === 0) {
    heroSlides = await prisma.heroSlide.findMany({ where: { tenant_id: null, deleted_at: null } });
  }

  const books = store.publishers?.books ?? [];
  const filteredBooks = selectedCategorySlug
    ? books.filter((book) =>
        book.categories.some((category) => category.slug.toLowerCase() === selectedCategorySlug)
      )
    : books;
  const featuredBooks = filteredBooks.filter((book) => book.featured_shop);
  const newArrivalBooks = filteredBooks.slice(0, 8);
  const showFeatured = isWhiteLabel ? storeSettings.showFeatured : true;
  const showNewArrivals = isWhiteLabel ? storeSettings.showNewArrivals : true;
  const showCategories = isWhiteLabel ? storeSettings.showCategories : true;
  const allCategories = showCategories
    ? Array.from(new Map(books.flatMap((book) => book.categories).map((category) => [category.id, category])).values())
    : [];

  const activeCategory = selectedCategorySlug
    ? allCategories.find((category) => category.slug.toLowerCase() === selectedCategorySlug) ?? null
    : null;
  const storeBio = store.publishers?.bio ?? "";
  const supportEmail = store.contact_email?.trim() || null;
  const supportWebsite = (() => {
    const website = typeof store.social_links === "object" && store.social_links
      ? (store.social_links as Record<string, string | null>).website
      : null;
    return website?.trim() || null;
  })();
  const isBoldPreset = isWhiteLabel && storeSettings.themePreset === "bold";
  const sectionToneStyle = isBoldPreset
    ? { background: secondaryColor, color: accentColor, borderColor: withAlpha(accentColor, 0.28) }
    : undefined;
  const cardShellStyle = isBoldPreset
    ? { background: "#ffffff", color: "#111111" }
    : undefined;

  return (
    <main className="pb-20" style={{ background: themeTokens.mainBg }}>
      <StoreHeroCarousel
        slides={heroSlides}
        layout={storeSettings.heroLayout}
        accentColor={accentColor}
        secondaryColor={secondaryColor}
        accentStyle={storeSettings.accentStyle}
        themePreset={storeSettings.themePreset}
      />

      <div className="mx-auto max-w-[1440px] px-6 py-10 md:px-12 md:py-12">
        <div className={themeTokens.contentShellClassName}>
          {(storeBio || isWhiteLabel) && (
            <section
              className={`mb-10 ${themeTokens.sectionShellClassName}`}
              style={sectionToneStyle ?? { background: withAlpha(accentColor, 0.08), borderColor: themeTokens.subduedBorder }}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="max-w-3xl space-y-3">
                  <h1 className={`text-3xl md:text-5xl ${themeTokens.headingTitleClassName}`}>
                    {store.name}
                    <span style={{ color: accentColor }}>.</span>
                  </h1>
                  <p className={`max-w-2xl text-sm md:text-base ${isBoldPreset ? "text-white/80" : "text-gray-600"}`}>
                    {storeBio || "A curated publishing storefront designed to feel distinct from the main marketplace and shaped around this publisher's own brand."}
                  </p>
                </div>
              </div>
            </section>
          )}

          {activeCategory && (
            <section
              className={`mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between ${themeTokens.sectionShellClassName}`}
              style={sectionToneStyle ?? { background: withAlpha(accentColor, 0.06), borderColor: themeTokens.subduedBorder }}
            >
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-50">Filtering Collection</p>
                <p className={`text-lg font-black uppercase tracking-tight ${isBoldPreset ? "text-white" : "text-black"}`}>
                  {activeCategory.name}
                </p>
                <p className={`text-xs ${isBoldPreset ? "text-white/75" : "text-gray-500"}`}>
                  Showing {filteredBooks.length} book{filteredBooks.length === 1 ? "" : "s"} in this category.
                </p>
              </div>
              <Link
                href={`/store/${slug}`}
                className="inline-flex w-fit items-center border px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-opacity hover:opacity-80"
                style={{
                  borderColor: isBoldPreset ? withAlpha(accentColor, 0.32) : secondaryColor,
                  background: isBoldPreset ? withAlpha("#ffffff", 0.08) : "#ffffff",
                  color: isBoldPreset ? accentColor : "#111111",
                }}
              >
                Clear Filter
              </Link>
            </section>
          )}

          {showFeatured && featuredBooks.length > 0 && (
            <section className={`mb-10 ${themeTokens.sectionShellClassName}`} style={sectionToneStyle ?? undefined}>
              <SectionHeading
                title="Featured"
                subtitle={`${featuredBooks.length} Picks`}
                accentColor={accentColor}
                headingTitleClassName={themeTokens.headingTitleClassName}
                headingMetaClassName={themeTokens.headingMetaClassName}
              />
              <div className="grid grid-cols-2 gap-6 md:gap-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {featuredBooks.map((book) => (
                  <div key={book.id} className={themeTokens.cardShellClassName} style={cardShellStyle}>
                    <ProductCard book={book} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {showCategories && allCategories.length > 0 && (
            <section className={`mb-10 ${themeTokens.sectionShellClassName}`} style={sectionToneStyle ?? undefined}>
              <SectionHeading
                title="Browse by Category"
                subtitle={`${allCategories.length} Categories`}
                accentColor={accentColor}
                headingTitleClassName={themeTokens.headingTitleClassName}
                headingMetaClassName={themeTokens.headingMetaClassName}
              />
              <div className="flex flex-wrap gap-3">
                {allCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/store/${slug}?category=${category.slug}`}
                    className="border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-opacity hover:opacity-80"
                    style={{
                      borderColor:
                        selectedCategorySlug === category.slug.toLowerCase()
                          ? accentColor
                          : isBoldPreset
                          ? withAlpha(accentColor, 0.3)
                          : secondaryColor,
                      background:
                        selectedCategorySlug === category.slug.toLowerCase()
                          ? accentColor
                          : isBoldPreset
                          ? withAlpha("#ffffff", 0.08)
                          : "#ffffff",
                      color:
                        selectedCategorySlug === category.slug.toLowerCase()
                          ? secondaryColor
                          : isBoldPreset
                          ? accentColor
                          : "#111111",
                    }}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {showNewArrivals && newArrivalBooks.length > 0 && showFeatured && featuredBooks.length > 0 && (
            <section className={`mb-10 ${themeTokens.sectionShellClassName}`} style={sectionToneStyle ?? undefined}>
              <SectionHeading
                title="New Arrivals"
                subtitle="Just Added"
                accentColor={accentColor}
                headingTitleClassName={themeTokens.headingTitleClassName}
                headingMetaClassName={themeTokens.headingMetaClassName}
              />
              <div className="grid grid-cols-2 gap-6 md:gap-8 sm:grid-cols-3 lg:grid-cols-4">
                {newArrivalBooks.slice(0, 4).map((book) => (
                  <div key={book.id} className={themeTokens.cardShellClassName} style={cardShellStyle}>
                    <ProductCard book={book} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className={themeTokens.sectionShellClassName} style={sectionToneStyle ?? undefined}>
            <div className="mb-10 flex items-end justify-between border-b-[1.5px] border-black/10 pb-5">
              <div className="space-y-1">
                <h2 className={`text-3xl md:text-5xl ${themeTokens.headingTitleClassName}`}>
                  The Collection
                  <span style={{ color: accentColor }}>.</span>
                </h2>
                <p className={themeTokens.headingMetaClassName}>
                  Curated Selection / {filteredBooks.length} Titles
                </p>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: accentColor }} />
                <span className={`text-[9px] font-black uppercase tracking-widest ${isBoldPreset ? "text-white/80" : ""}`}>Live Now</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 md:gap-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredBooks.map((book) => (
                <div key={book.id} className={themeTokens.cardShellClassName} style={cardShellStyle}>
                  <ProductCard book={book} />
                </div>
              ))}
            </div>

            {filteredBooks.length === 0 && (
              <div className="flex flex-col items-center justify-center border-[1.5px] border-dashed border-black/10 py-32">
                <p className={`text-xl font-black uppercase tracking-tighter opacity-30 ${storeSettings.headingStyle === "serif" ? "font-serif normal-case" : "italic"}`}>
                  {activeCategory ? "No books in this category yet" : "Library is being updated"}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      <footer
        className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-6 border-t-[1.5px] px-6 pt-10 md:flex-row md:px-12"
        style={{ borderColor: themeTokens.subduedBorder, color: themeTokens.footerText }}
      >
        <div className="flex items-center gap-4">
          {!isWhiteLabel && (
            <Link href="/" className="text-[9px] font-black uppercase tracking-widest opacity-30">
              Built with Booka.
            </Link>
          )}
          <p className="text-[9px] font-black uppercase tracking-widest opacity-50">
            © {new Date().getFullYear()} {store.name}
          </p>
        </div>
        <div className="flex gap-6">
          {supportEmail && (
            <a href={`mailto:${supportEmail}`} className="text-[9px] font-black uppercase tracking-widest hover:opacity-70" style={{ color: "inherit" }}>
              Support
            </a>
          )}
          {supportWebsite && (
            <a href={supportWebsite} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black uppercase tracking-widest hover:opacity-70" style={{ color: "inherit" }}>
              Website
            </a>
          )}
        </div>
      </footer>
    </main>
  );
}

function SectionHeading({
  title,
  subtitle,
  accentColor,
  headingTitleClassName,
  headingMetaClassName,
}: {
  title: string;
  subtitle: string;
  accentColor: string;
  headingTitleClassName: string;
  headingMetaClassName: string;
}) {
  return (
    <div className="mb-10 flex justify-between border-b-[1.5px] border-black/10 pb-5">
      <div className="space-y-1">
        <h2 className={`text-2xl md:text-4xl ${headingTitleClassName}`}>
          {title}
          <span style={{ color: accentColor }}>.</span>
        </h2>
        <p className={headingMetaClassName}>{subtitle}</p>
      </div>
    </div>
  );
}
