import {
  DEFAULT_FEZ_SHIPPING_RATES as DEFAULT_FEZ_SHIPPING_RATES_BASE,
  DEFAULT_SHIPPING_PROVIDER_OPTIONS as DEFAULT_SHIPPING_PROVIDER_OPTIONS_BASE,
  DEFAULT_SPEEDAF_SHIPPING_RATES as DEFAULT_SPEEDAF_SHIPPING_RATES_BASE,
} from "@/lib/constants";

export const DEFAULT_SPEEDAF_SHIPPING_RATES = {
  Z1: DEFAULT_SPEEDAF_SHIPPING_RATES_BASE.Z1,
  Z2: DEFAULT_SPEEDAF_SHIPPING_RATES_BASE.Z2,
  Z3: DEFAULT_SPEEDAF_SHIPPING_RATES_BASE.Z3,
  Z4: DEFAULT_SPEEDAF_SHIPPING_RATES_BASE.Z4,
};

export const DEFAULT_FEZ_SHIPPING_RATES = {
  kg_cutoff: DEFAULT_FEZ_SHIPPING_RATES_BASE.kg_cutoff,
  G1: DEFAULT_FEZ_SHIPPING_RATES_BASE.G1,
  G2: DEFAULT_FEZ_SHIPPING_RATES_BASE.G2,
  G3: DEFAULT_FEZ_SHIPPING_RATES_BASE.G3,
  G4: DEFAULT_FEZ_SHIPPING_RATES_BASE.G4,
  G5: DEFAULT_FEZ_SHIPPING_RATES_BASE.G5,
  G6: DEFAULT_FEZ_SHIPPING_RATES_BASE.G6,
};

export const DEFAULT_SHIPPING_PROVIDER_OPTIONS = {
  speedaf: DEFAULT_SHIPPING_PROVIDER_OPTIONS_BASE.speedaf,
  fez: DEFAULT_SHIPPING_PROVIDER_OPTIONS_BASE.fez,
};

export type BookFeatureToggles = {
  subtitle: boolean;
  language: boolean;
  isbn: boolean;
  publication_date: boolean;
  paperback: boolean;
  hardcover: boolean;
  flap: boolean;
  physical_printing: boolean;
};

export const COMMON_BOOK_LANGUAGES = [
  "English",
  "French",
  "Arabic",
  "Portuguese",
  "Swahili",
  "Amharic",
  "Hausa",
  "Yoruba",
  "Igbo",
  "Somali",
  "Zulu",
  "Xhosa",
  "Afrikaans",
  "Lingala",
  "Kinyarwanda",
  "Other",
] as const;

export type SizeRange = {
  width_min: number;
  width_max: number;
  height_min: number;
  height_max: number;
};

export type BookSizeRanges = {
  A6: SizeRange;
  A5: SizeRange;
  A4: SizeRange;
};

export type BookFlapCosts = {
  single: Record<"A6" | "A5" | "A4", number>;
  double: Record<"A6" | "A5" | "A4", number>;
};

export type BookCustomFieldOption = {
  label: string;
  value: string;
};

export type BookCustomFieldDefinition = {
  key: string;
  label: string;
  field_type: "text" | "textarea" | "number" | "date" | "select" | "checkbox";
  placeholder?: string;
  help_text?: string;
  options?: BookCustomFieldOption[];
  required?: boolean;
  enabled?: boolean;
  show_on_public_page?: boolean;
  show_on_creator_view?: boolean;
  show_on_admin_view?: boolean;
  section?: string;
  sort_order?: number;
};

export const DEFAULT_BOOK_FEATURE_TOGGLES: BookFeatureToggles = {
  subtitle: true,
  language: true,
  isbn: true,
  publication_date: true,
  paperback: true,
  hardcover: true,
  flap: true,
  physical_printing: true,
};

export const DEFAULT_BOOK_SIZE_RANGES: BookSizeRanges = {
  A6: { width_min: 0, width_max: 4.0, height_min: 0, height_max: 5.83 },
  A5: { width_min: 4.1, width_max: 5.83, height_min: 5.84, height_max: 8.2 },
  A4: { width_min: 5.84, width_max: 8.2, height_min: 8.21, height_max: 11.5 },
};

export const DEFAULT_BOOK_FLAP_COSTS: BookFlapCosts = {
  single: { A6: 0, A5: 0, A4: 0 },
  double: { A6: 0, A5: 0, A4: 0 },
};

export const STANDARD_SIZE_DIMENSIONS_IN: Record<"A6" | "A5" | "A4", { width: number; height: number }> = {
  A6: { width: 4.1, height: 5.8 },
  A5: { width: 5.83, height: 8.27 },
  A4: { width: 8.27, height: 11.69 },
};

export const DEFAULT_BOOK_LIVE_PRICING_ENABLED = true;

export function normalizeBookFeatureToggles(value: any): BookFeatureToggles {
  return {
    subtitle: value?.subtitle ?? DEFAULT_BOOK_FEATURE_TOGGLES.subtitle,
    language: value?.language ?? DEFAULT_BOOK_FEATURE_TOGGLES.language,
    isbn: value?.isbn ?? DEFAULT_BOOK_FEATURE_TOGGLES.isbn,
    publication_date: value?.publication_date ?? DEFAULT_BOOK_FEATURE_TOGGLES.publication_date,
    paperback: value?.paperback ?? DEFAULT_BOOK_FEATURE_TOGGLES.paperback,
    hardcover: value?.hardcover ?? DEFAULT_BOOK_FEATURE_TOGGLES.hardcover,
    flap: value?.flap ?? DEFAULT_BOOK_FEATURE_TOGGLES.flap,
    physical_printing: value?.physical_printing ?? DEFAULT_BOOK_FEATURE_TOGGLES.physical_printing,
  };
}

export function normalizeBookSizeRanges(value: any): BookSizeRanges {
  return {
    A6: { ...DEFAULT_BOOK_SIZE_RANGES.A6, ...(value?.A6 ?? {}) },
    A5: { ...DEFAULT_BOOK_SIZE_RANGES.A5, ...(value?.A5 ?? {}) },
    A4: { ...DEFAULT_BOOK_SIZE_RANGES.A4, ...(value?.A4 ?? {}) },
  };
}

export function normalizeBookFlapCosts(value: any): BookFlapCosts {
  return {
    single: { ...DEFAULT_BOOK_FLAP_COSTS.single, ...(value?.single ?? {}) },
    double: { ...DEFAULT_BOOK_FLAP_COSTS.double, ...(value?.double ?? {}) },
  };
}

export function normalizeBookCustomFields(value: any): BookCustomFieldDefinition[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((field) => field && typeof field.key === "string" && typeof field.label === "string")
    .map((field, index) => ({
      key: field.key,
      label: field.label,
      field_type: field.field_type ?? "text",
      placeholder: field.placeholder ?? "",
      help_text: field.help_text ?? "",
      options: Array.isArray(field.options) ? field.options : [],
      required: !!field.required,
      enabled: field.enabled ?? true,
      show_on_public_page: !!field.show_on_public_page,
      show_on_creator_view: field.show_on_creator_view ?? true,
      show_on_admin_view: field.show_on_admin_view ?? true,
      section: field.section ?? "Additional Information",
      sort_order: typeof field.sort_order === "number" ? field.sort_order : index,
    }))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function normalizeBookLivePricingEnabled(value: any) {
  return typeof value === "boolean" ? value : DEFAULT_BOOK_LIVE_PRICING_ENABLED;
}

export function matchSizeBucket(
  width: number,
  height: number,
  ranges: BookSizeRanges
): "A6" | "A5" | "A4" | null {
  const entries = Object.entries(ranges) as Array<["A6" | "A5" | "A4", SizeRange]>;

  for (const [bucket, range] of entries) {
    const inWidthRange = width >= range.width_min && width <= range.width_max;
    const inHeightRange = height >= range.height_min && height <= range.height_max;

    if (inWidthRange && inHeightRange) {
      return bucket;
    }
  }

  return null;
}

export function formatDimensionsInches(width?: number | null, height?: number | null) {
  if (!width || !height) return null;
  return `${width.toFixed(2)} x ${height.toFixed(2)} inches`;
}

export function getBookLanguageLabel(value?: string | null) {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  const languageMap: Record<string, string> = {
    en: "English",
    english: "English",
    fr: "French",
    french: "French",
    ar: "Arabic",
    arabic: "Arabic",
    pt: "Portuguese",
    portuguese: "Portuguese",
    sw: "Swahili",
    swahili: "Swahili",
    am: "Amharic",
    amharic: "Amharic",
    ha: "Hausa",
    hausa: "Hausa",
    yo: "Yoruba",
    yoruba: "Yoruba",
    ig: "Igbo",
    igbo: "Igbo",
    so: "Somali",
    somali: "Somali",
    zu: "Zulu",
    zulu: "Zulu",
    xh: "Xhosa",
    xhosa: "Xhosa",
    af: "Afrikaans",
    afrikaans: "Afrikaans",
    ln: "Lingala",
    lingala: "Lingala",
    rw: "Kinyarwanda",
    kinyarwanda: "Kinyarwanda",
    other: "Other",
  };

  return languageMap[normalized] ?? value;
}

export function normalizeBookLanguageValue(value?: string | null) {
  return getBookLanguageLabel(value) ?? "English";
}

export function slugifyBookAssetName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function getFlapCost(
  flapType: string | null | undefined,
  sizeBucket: "A6" | "A5" | "A4" | null | undefined,
  flapCosts: BookFlapCosts
) {
  if (!sizeBucket || !flapType || flapType === "none") return 0;
  if (flapType === "single") return flapCosts.single[sizeBucket] ?? 0;
  if (flapType === "double") return flapCosts.double[sizeBucket] ?? 0;
  return 0;
}

export function getCustomFieldValueMap(metadata: any): Record<string, any> {
  return metadata?.custom_fields && typeof metadata.custom_fields === "object"
    ? metadata.custom_fields
    : {};
}
