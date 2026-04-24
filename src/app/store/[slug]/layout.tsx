// src/app/store/[slug]/layout.tsx
// Server component — fetches full tenant branding and injects it as CSS vars.
// White-label stores get custom fonts + colors; standard stores get defaults.

import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { ShoppingCart, Search } from "lucide-react";
import { PublicTranslationProvider } from "@/components/shared/translation-provider";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

interface StoreLayoutProps {
  children: React.ReactNode;
  params: { slug: string };
}

// Font class map — Tailwind can't do dynamic class names, so we use
// inline style on the wrapper and a data-font attribute for any
// additional CSS you want to layer in globals.css.
const FONT_STACK: Record<string, string> = {
  inter:          "'Inter', system-ui, sans-serif",
  playfair:       "'Playfair Display', Georgia, serif",
  "space-grotesk": "'Space Grotesk', system-ui, sans-serif",
  lora:           "'Lora', Georgia, serif",
};

// Google Fonts import URLs for each white-label font option.
const FONT_IMPORTS: Record<string, string> = {
  playfair:        "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,700;1,900&display=swap",
  "space-grotesk": "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap",
  lora:            "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400;1,700&display=swap",
};

export default async function StoreLayout({ children, params }: StoreLayoutProps) {
  const { slug } = params;

  const store = await prisma.tenant.findUnique({
    where: { slug },
    include: { publishers: true },
    // select expanded so we can read new fields without breaking old shape
  });

  // ── Resolve branding values ──────────────────────────────────────────────
  const isWhiteLabel = store?.publishers?.white_label ?? false;

  // Default platform accent is yellow
  const accentColor     = (isWhiteLabel && store?.brand_color)     ? store.brand_color     : "#FFD700";
  const secondaryColor  = (isWhiteLabel && store?.secondary_color) ? store.secondary_color : "#000000";
  const fontFamily      = (isWhiteLabel && (store as any)?.font_family)
    ? FONT_STACK[(store as any).font_family] ?? FONT_STACK.inter
    : FONT_STACK.inter;
  const fontKey         = (isWhiteLabel && (store as any)?.font_family) ? (store as any).font_family : "inter";
  const tagline         = (isWhiteLabel && (store as any)?.tagline) ? (store as any).tagline : null;

  const socialLinks = (store?.social_links as Record<string, string | null> | null) ?? {};

  // ── CSS custom properties to inject ──────────────────────────────────────
  // --store-accent  → replaces the platform yellow (#FFD700) in this context
  // --store-fg      → nav text / borders (usually black, can be overridden)
  // --store-bg      → page background
  const cssVars = [
    `--store-accent: ${accentColor}`,
    `--store-secondary: ${secondaryColor}`,
    `--store-font: ${fontFamily}`,
  ].join("; ");

  // Computed nav bg: for white-label use secondary; otherwise white
  const navBg    = isWhiteLabel ? secondaryColor : "#ffffff";
  const navText  = isWhiteLabel ? accentColor    : "#000000";
  const navBorder = isWhiteLabel ? secondaryColor : "#000000";

  return (
    <PublicTranslationProvider>
    <div
      className="min-h-screen selection:bg-[var(--store-accent)] selection:text-black"
      style={{ fontFamily, ["--store-accent" as any]: accentColor, ["--store-secondary" as any]: secondaryColor }}
      data-font={fontKey}
      data-white-label={isWhiteLabel ? "true" : "false"}
    >
      {/* Inject Google Font if needed for white-label */}
      {isWhiteLabel && fontKey !== "inter" && FONT_IMPORTS[fontKey] && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href={FONT_IMPORTS[fontKey]} />
      )}

      {/* ── Navigation ── */}
      <nav
        className="h-16 sticky top-0 z-50 border-b-[1.5px]"
        style={{
          background:   navBg,
          color:        navText,
          borderColor:  navBorder,
        }}
      >
        <div className="max-w-[1440px] mx-auto px-6 h-full flex items-center justify-between">

          {/* Logo / name */}
          <Link href={`/${slug}`} className="flex items-center gap-3 group">
            {store?.logo_url ? (
              <div className="relative h-8 w-8 border rounded-sm overflow-hidden" style={{ borderColor: isWhiteLabel ? accentColor + "40" : "#00000020" }}>
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
                className="w-8 h-8 rotate-3 border-[1.5px] flex items-center justify-center text-[10px] font-black italic transition-transform group-hover:rotate-0"
                style={{ background: accentColor, borderColor: navText, color: isWhiteLabel ? secondaryColor : "#fff" }}
              >
                {(store?.name ?? "B").charAt(0).toUpperCase()}.
              </div>
            )}
            <div className="flex flex-col leading-none">
              <span
                className="font-black uppercase italic tracking-tighter text-lg"
                style={{ color: navText }}
              >
                {store?.name || "Booka Store"}
                <span style={{ color: accentColor }}>.</span>
              </span>
              {tagline && (
                <span className="text-[9px] font-medium tracking-wide opacity-60 mt-0.5" style={{ color: navText }}>
                  {tagline}
                </span>
              )}
            </div>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-3 md:gap-4">
            <LanguageSwitcher compact inverted={isWhiteLabel} />
            <button className="transition-colors hover:opacity-70" style={{ color: navText }}>
              <Search size={20} />
            </button>
            <Link
              href="/cart"
              className="relative p-2 rounded-full transition-all border-[1.5px]"
              style={{
                background:  navText,
                color:       navBg,
                borderColor: navText,
              }}
            >
              <ShoppingCart size={18} />
            </Link>
          </div>
        </div>
      </nav>

      <main style={{ background: isWhiteLabel ? "#FAFAFA" : "#FAF9F6" }}>
        {children}
      </main>

      {/* If white-label has social links, expose them in a tiny global footer strip */}
      {isWhiteLabel && Object.values(socialLinks).some(Boolean) && (
        <div
          className="border-t-[1.5px] py-3 flex justify-center gap-8"
          style={{ borderColor: secondaryColor, background: secondaryColor, color: accentColor }}
        >
          {socialLinks.website   && <a href={socialLinks.website}   target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest hover:opacity-70">Website</a>}
          {socialLinks.twitter   && <a href={socialLinks.twitter}   target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest hover:opacity-70">X</a>}
          {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest hover:opacity-70">Instagram</a>}
          {socialLinks.facebook  && <a href={socialLinks.facebook}  target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest hover:opacity-70">Facebook</a>}
        </div>
      )}
    </div>
    </PublicTranslationProvider>
  );
}
