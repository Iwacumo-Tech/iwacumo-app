import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { ShoppingCart, Search } from "lucide-react";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { getStorefrontThemeTokens, normalizeStorefrontThemeSettings } from "@/lib/storefront-theme";

interface StoreLayoutProps {
  children: React.ReactNode;
  params: { slug: string };
}

const FONT_STACK: Record<string, string> = {
  inter: "'Inter', system-ui, sans-serif",
  playfair: "'Playfair Display', Georgia, serif",
  "space-grotesk": "'Space Grotesk', system-ui, sans-serif",
  lora: "'Lora', Georgia, serif",
};

const FONT_IMPORTS: Record<string, string> = {
  playfair: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,700;1,900&display=swap",
  "space-grotesk": "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap",
  lora: "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400;1,700&display=swap",
};

export default async function StoreLayout({ children, params }: StoreLayoutProps) {
  const { slug } = params;

  const store = await prisma.tenant.findUnique({
    where: { slug },
    include: { publishers: true },
  });

  const isWhiteLabel = store?.publishers?.white_label ?? false;
  const accentColor = isWhiteLabel && store?.brand_color ? store.brand_color : "#FFD700";
  const secondaryColor = isWhiteLabel && store?.secondary_color ? store.secondary_color : "#000000";
  const fontFamily = isWhiteLabel && (store as any)?.font_family
    ? FONT_STACK[(store as any).font_family] ?? FONT_STACK.inter
    : FONT_STACK.inter;
  const fontKey = isWhiteLabel && (store as any)?.font_family ? (store as any).font_family : "inter";
  const tagline = isWhiteLabel && (store as any)?.tagline ? (store as any).tagline : null;
  const socialLinks = (store?.social_links as Record<string, string | null> | null) ?? {};
  const storeThemeSettings = normalizeStorefrontThemeSettings((store as any)?.store_settings ?? null);
  const themeTokens = getStorefrontThemeTokens({
    isWhiteLabel,
    accentColor,
    secondaryColor,
    settings: storeThemeSettings,
  });

  return (
    <div
      className="min-h-screen selection:bg-[var(--store-accent)] selection:text-black"
      style={{
        fontFamily,
        background: themeTokens.mainBg,
        ["--store-accent" as any]: accentColor,
        ["--store-secondary" as any]: secondaryColor,
      }}
      data-font={fontKey}
      data-white-label={isWhiteLabel ? "true" : "false"}
    >
      {isWhiteLabel && fontKey !== "inter" && FONT_IMPORTS[fontKey] && (
        <link rel="stylesheet" href={FONT_IMPORTS[fontKey]} />
      )}

      <nav
        className={`sticky top-0 z-50 ${themeTokens.navShellClassName}`}
        style={{
          background: themeTokens.navBg,
          color: themeTokens.navText,
          borderColor: themeTokens.navBorder,
        }}
      >
        <div className="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between px-6">
          <Link href={`/store/${slug}`} className="group flex items-center gap-3">
            {store?.logo_url ? (
              <div
                className="relative h-8 w-8 overflow-hidden rounded-sm border"
                style={{ borderColor: isWhiteLabel ? `${accentColor}40` : "#00000020" }}
              >
                <Image
                  src={store.logo_url}
                  alt={store.name || "Store Logo"}
                  fill
                  className="object-contain"
                  sizes="32px"
                />
              </div>
            ) : (
              <div
                className="flex h-8 w-8 rotate-3 items-center justify-center border-[1.5px] text-[10px] font-black italic transition-transform group-hover:rotate-0"
                style={{
                  background: accentColor,
                  borderColor: themeTokens.navText,
                  color: isWhiteLabel ? secondaryColor : "#fff",
                }}
              >
                {(store?.name ?? "B").charAt(0).toUpperCase()}.
              </div>
            )}
            <div className="flex flex-col leading-none">
              <span className="text-lg font-black uppercase italic tracking-tighter" style={{ color: themeTokens.navText }}>
                {store?.name || "Booka Store"}
                <span style={{ color: accentColor }}>.</span>
              </span>
              {tagline && (
                <span className="mt-0.5 text-[9px] font-medium tracking-wide opacity-60" style={{ color: themeTokens.navText }}>
                  {tagline}
                </span>
              )}
            </div>
          </Link>

          <div className="flex items-center gap-3 md:gap-4">
            <LanguageSwitcher compact inverted={isWhiteLabel} />
            <button className="transition-colors hover:opacity-70" style={{ color: themeTokens.navText }}>
              <Search size={20} />
            </button>
            <Link
              href="/cart"
              className="relative rounded-full border-[1.5px] p-2 transition-all"
              style={{
                background: themeTokens.navText,
                color: themeTokens.navBg,
                borderColor: themeTokens.navText,
              }}
            >
              <ShoppingCart size={18} />
            </Link>
          </div>
        </div>
      </nav>

      <main style={{ background: themeTokens.mainBg }}>
        {children}
      </main>

      {isWhiteLabel && Object.values(socialLinks).some(Boolean) && (
        <div
          className="flex justify-center gap-8 border-t-[1.5px] py-3"
          style={{
            borderColor: secondaryColor,
            background: themeTokens.footerBg === "transparent" ? secondaryColor : themeTokens.footerBg,
            color: themeTokens.footerText,
          }}
        >
          {socialLinks.website && <a href={socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest hover:opacity-70">Website</a>}
          {socialLinks.twitter && <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest hover:opacity-70">X</a>}
          {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest hover:opacity-70">Instagram</a>}
          {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest hover:opacity-70">Facebook</a>}
        </div>
      )}
    </div>
  );
}
