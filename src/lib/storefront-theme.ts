export const STOREFRONT_THEME_PRESETS = [
  { value: "editorial", label: "Editorial", description: "Warm, literary, and magazine-inspired." },
  { value: "modern", label: "Modern", description: "Clean, airy, and contemporary." },
  { value: "minimal", label: "Minimal", description: "Quiet, restrained, and product-led." },
  { value: "bold", label: "Bold", description: "High-contrast, energetic, and brand-heavy." },
] as const;

export const STOREFRONT_PAGE_SURFACES = [
  { value: "paper", label: "Paper", description: "Soft editorial paper background." },
  { value: "studio", label: "Studio", description: "Cool polished storefront backdrop." },
  { value: "contrast", label: "Contrast", description: "Deeper, more dramatic stage." },
] as const;

export const STOREFRONT_NAV_STYLES = [
  { value: "solid", label: "Solid", description: "Classic full-width bar." },
  { value: "framed", label: "Framed", description: "Sharper bordered navigation." },
  { value: "floating", label: "Floating", description: "Elevated pill-like navigation." },
] as const;

export const STOREFRONT_CARD_STYLES = [
  { value: "shadow", label: "Shadow", description: "Lifted storefront cards." },
  { value: "bordered", label: "Bordered", description: "Sharper catalog presentation." },
  { value: "soft", label: "Soft", description: "Softer panels with gentler edges." },
] as const;

export const STOREFRONT_HEADING_STYLES = [
  { value: "italic", label: "Italic", description: "Expressive and high-drama headings." },
  { value: "serif", label: "Serif", description: "Refined editorial headline tone." },
  { value: "caps", label: "Caps", description: "Structured bold uppercase treatment." },
] as const;

export type StorefrontThemePreset = typeof STOREFRONT_THEME_PRESETS[number]["value"];
export type StorefrontPageSurface = typeof STOREFRONT_PAGE_SURFACES[number]["value"];
export type StorefrontNavStyle = typeof STOREFRONT_NAV_STYLES[number]["value"];
export type StorefrontCardStyle = typeof STOREFRONT_CARD_STYLES[number]["value"];
export type StorefrontHeadingStyle = typeof STOREFRONT_HEADING_STYLES[number]["value"];

export type StorefrontThemeSettings = {
  themePreset: StorefrontThemePreset;
  pageSurface: StorefrontPageSurface;
  navStyle: StorefrontNavStyle;
  cardStyle: StorefrontCardStyle;
  headingStyle: StorefrontHeadingStyle;
  heroLayout: "split" | "full" | "minimal";
  accentStyle: "bold" | "outline" | "soft";
  showCategories: boolean;
  showNewArrivals: boolean;
  showFeatured: boolean;
};

const DEFAULT_STOREFRONT_THEME_SETTINGS: StorefrontThemeSettings = {
  themePreset: "editorial",
  pageSurface: "paper",
  navStyle: "solid",
  cardStyle: "shadow",
  headingStyle: "italic",
  heroLayout: "split",
  accentStyle: "bold",
  showCategories: true,
  showNewArrivals: true,
  showFeatured: true,
};

export function normalizeStorefrontThemeSettings(raw: Record<string, any> | null | undefined): StorefrontThemeSettings {
  return {
    themePreset: isThemePreset(raw?.themePreset) ? raw!.themePreset : DEFAULT_STOREFRONT_THEME_SETTINGS.themePreset,
    pageSurface: isPageSurface(raw?.pageSurface) ? raw!.pageSurface : DEFAULT_STOREFRONT_THEME_SETTINGS.pageSurface,
    navStyle: isNavStyle(raw?.navStyle) ? raw!.navStyle : DEFAULT_STOREFRONT_THEME_SETTINGS.navStyle,
    cardStyle: isCardStyle(raw?.cardStyle) ? raw!.cardStyle : DEFAULT_STOREFRONT_THEME_SETTINGS.cardStyle,
    headingStyle: isHeadingStyle(raw?.headingStyle) ? raw!.headingStyle : DEFAULT_STOREFRONT_THEME_SETTINGS.headingStyle,
    heroLayout: raw?.heroLayout === "full" || raw?.heroLayout === "minimal" ? raw.heroLayout : DEFAULT_STOREFRONT_THEME_SETTINGS.heroLayout,
    accentStyle: raw?.accentStyle === "outline" || raw?.accentStyle === "soft" ? raw.accentStyle : DEFAULT_STOREFRONT_THEME_SETTINGS.accentStyle,
    showCategories: raw?.showCategories ?? DEFAULT_STOREFRONT_THEME_SETTINGS.showCategories,
    showNewArrivals: raw?.showNewArrivals ?? DEFAULT_STOREFRONT_THEME_SETTINGS.showNewArrivals,
    showFeatured: raw?.showFeatured ?? DEFAULT_STOREFRONT_THEME_SETTINGS.showFeatured,
  };
}

function isThemePreset(value: unknown): value is StorefrontThemePreset {
  return STOREFRONT_THEME_PRESETS.some((option) => option.value === value);
}

function isPageSurface(value: unknown): value is StorefrontPageSurface {
  return STOREFRONT_PAGE_SURFACES.some((option) => option.value === value);
}

function isNavStyle(value: unknown): value is StorefrontNavStyle {
  return STOREFRONT_NAV_STYLES.some((option) => option.value === value);
}

function isCardStyle(value: unknown): value is StorefrontCardStyle {
  return STOREFRONT_CARD_STYLES.some((option) => option.value === value);
}

function isHeadingStyle(value: unknown): value is StorefrontHeadingStyle {
  return STOREFRONT_HEADING_STYLES.some((option) => option.value === value);
}

function toRgbTriplet(hex: string) {
  const sanitized = hex.replace("#", "");
  const normalized = sanitized.length === 3
    ? sanitized.split("").map((char) => char + char).join("")
    : sanitized;

  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = toRgbTriplet(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getStorefrontThemeTokens({
  isWhiteLabel,
  accentColor,
  secondaryColor,
  settings,
}: {
  isWhiteLabel: boolean;
  accentColor: string;
  secondaryColor: string;
  settings: StorefrontThemeSettings;
}) {
  if (!isWhiteLabel) {
    return {
      navBg: "#ffffff",
      navText: "#000000",
      navBorder: "#000000",
      navShellClassName: "",
      mainBg: "#FAF9F6",
      contentShellClassName: "",
      sectionShellClassName: "",
      cardShellClassName: "",
      headingTitleClassName: "text-black font-black uppercase italic tracking-tighter",
      headingMetaClassName: "text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400",
      footerBg: "transparent",
      footerText: "#111111",
      marqueeBg: secondaryColor,
      marqueeText: accentColor,
      accentHalo: withAlpha(accentColor, 0.18),
      subduedBorder: "rgba(0,0,0,0.10)",
    };
  }

  const preset = settings.themePreset;
  const surface = settings.pageSurface;
  const navStyle = settings.navStyle;
  const cardStyle = settings.cardStyle;
  const headingStyle = settings.headingStyle;

  const mainBgBySurface = {
    paper: preset === "editorial" ? "#F6EFE4" : preset === "modern" ? "#F4F7FB" : preset === "minimal" ? "#F7F6F2" : withAlpha(accentColor, 0.08),
    studio: preset === "editorial" ? "#EFE7DB" : preset === "modern" ? "#EEF3FA" : preset === "minimal" ? "#F3F3EF" : withAlpha(secondaryColor, 0.08),
    contrast: preset === "bold" ? withAlpha(secondaryColor, 0.95) : "#EEE6DA",
  } satisfies Record<StorefrontPageSurface, string>;

  const navBgByStyle = {
    solid: preset === "bold" ? secondaryColor : "#ffffff",
    framed: "#ffffff",
    floating: withAlpha("#ffffff", 0.88),
  } satisfies Record<StorefrontNavStyle, string>;

  const navTextByStyle = {
    solid: preset === "bold" ? accentColor : secondaryColor,
    framed: secondaryColor,
    floating: secondaryColor,
  } satisfies Record<StorefrontNavStyle, string>;

  const navBorderByStyle = {
    solid: preset === "bold" ? secondaryColor : withAlpha(secondaryColor, 0.18),
    framed: secondaryColor,
    floating: withAlpha(secondaryColor, 0.18),
  } satisfies Record<StorefrontNavStyle, string>;

  const headingTitleClassByStyle = {
    italic: "text-black font-black uppercase italic tracking-tighter",
    serif: "text-black font-bold tracking-tight font-serif",
    caps: "text-black font-black uppercase tracking-[0.18em]",
  } satisfies Record<StorefrontHeadingStyle, string>;

  const cardShellClassByStyle = {
    shadow: "bg-white border-[1.5px] border-black/10 p-3 gumroad-shadow-sm",
    bordered: "bg-white border-[1.5px] border-black p-3",
    soft: "bg-white/80 border border-black/10 rounded-[24px] p-3 backdrop-blur",
  } satisfies Record<StorefrontCardStyle, string>;

  return {
    navBg: navBgByStyle[navStyle],
    navText: navTextByStyle[navStyle],
    navBorder: navBorderByStyle[navStyle],
    navShellClassName: navStyle === "floating" ? "mx-3 mt-3 rounded-[28px] border shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-md" : navStyle === "framed" ? "border-b-[1.5px] border-t-[1.5px]" : "border-b-[1.5px]",
    mainBg: mainBgBySurface[surface],
    contentShellClassName: surface === "contrast" ? "rounded-[36px] bg-white/96 shadow-[0_20px_60px_rgba(0,0,0,0.08)]" : "",
    sectionShellClassName: preset === "editorial" ? "rounded-[28px] bg-white/70 p-6 md:p-8" : preset === "modern" ? "rounded-[28px] bg-white p-6 md:p-8 shadow-[0_12px_40px_rgba(15,23,42,0.08)]" : preset === "minimal" ? "rounded-[24px] bg-white/85 p-6 md:p-8 border border-black/5" : "rounded-[28px] p-6 md:p-8 text-white",
    cardShellClassName: cardShellClassByStyle[cardStyle],
    headingTitleClassName: headingTitleClassByStyle[headingStyle],
    headingMetaClassName: headingStyle === "caps" ? "text-[9px] font-black uppercase tracking-[0.22em] text-gray-500" : "text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400",
    footerBg: preset === "bold" ? secondaryColor : "transparent",
    footerText: preset === "bold" ? accentColor : "#111111",
    marqueeBg: preset === "modern" ? withAlpha(secondaryColor, 0.92) : secondaryColor,
    marqueeText: accentColor,
    accentHalo: withAlpha(accentColor, preset === "bold" ? 0.24 : 0.14),
    subduedBorder: withAlpha(secondaryColor, 0.12),
  };
}
