"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type DefaultValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { createBookSchema, TCreateBookSchema } from "@/server/dtos";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/app/_providers/trpc-provider";
import { Book } from "@prisma/client";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { uploadFileToBlob } from "@/lib/upload-client";
import Link from "next/link";
import { Loader2, CheckCircle2, UploadCloud, Edit3, TrendingUp, Info, AlertTriangle, ArrowRight } from "lucide-react";
import {
  COMMON_BOOK_LANGUAGES,
  formatDimensionsInches,
  normalizeBookLanguageValue,
  matchSizeBucket,
  normalizeBookCustomFields,
  STANDARD_SIZE_DIMENSIONS_IN,
  type BookCustomFieldDefinition,
} from "@/lib/book-config";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BookFormProps {
  book?: Book;
  action: "Add" | "Edit";
  trigger?: React.ReactNode;
}

type PayoutGateEntity = {
  entity_type: "publisher" | "author";
  entity_id: string;
  display_name: string;
  payout_ready: boolean;
  blocking_reason_labels: string[];
};

function getFriendlyBookError(message?: string) {
  if (!message) return "Please check the form and try again.";

  try {
    const parsed = JSON.parse(message);
    if (Array.isArray(parsed)) {
      const first = parsed[0];
      if (first?.path?.includes("list_price")) return "Please enter a valid price. Free e-books can be set to 0.";
      if (typeof first?.message === "string") return first.message;
    }
  } catch {
    // Not a JSON validation payload; fall through to friendly string checks.
  }

  if (message.includes("list_price")) return "Please enter a valid price. Free e-books can be set to 0.";
  if (message.includes("ebook_price")) return "Please enter the e-book price. Use 0 if it should be free.";

  return message.length > 180 ? "Please check the form and try again." : message;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pricing helpers  (pure functions — defined outside component)
// ─────────────────────────────────────────────────────────────────────────────

interface SystemSettings {
  printing_costs: {
    paperback: Record<string, { cover: number; page: number }>;
    hardcover: Record<string, { cover: number; page: number }>;
  };
  platform_fee: { type: "percentage" | "flat"; value: number };
  default_markup: number;
  book_feature_toggles: {
    subtitle: boolean;
    language: boolean;
    isbn: boolean;
    publication_date: boolean;
    paperback: boolean;
    hardcover: boolean;
    flap: boolean;
    physical_printing: boolean;
  };
  book_size_ranges: {
    A6: { width_min: number; width_max: number; height_min: number; height_max: number };
    A5: { width_min: number; width_max: number; height_min: number; height_max: number };
    A4: { width_min: number; width_max: number; height_min: number; height_max: number };
  };
  book_flap_costs: {
    single: Record<string, number>;
    double: Record<string, number>;
  };
  book_live_pricing_enabled?: boolean;
  book_custom_fields: BookCustomFieldDefinition[];
}

function calcPrintCost(
  settings: SystemSettings,
  format: "paperback" | "hardcover",
  size: string,
  pageCount: number,
  flapType: "none" | "single" | "double" = "none",
  specialAddonFee = 0
): number {
  const cfg = settings.printing_costs[format]?.[size];
  if (!cfg) return 0;
  const flapCost =
    flapType === "single"
      ? settings.book_flap_costs.single?.[size] ?? 0
      : flapType === "double"
      ? settings.book_flap_costs.double?.[size] ?? 0
      : 0;
  return cfg.cover + cfg.page * pageCount + flapCost + specialAddonFee;
}

function calcPlatformFee(settings: SystemSettings, printCost: number): number {
  if (settings.platform_fee.type === "flat") return settings.platform_fee.value;
  return printCost * (settings.platform_fee.value / 100);
}

function calcDefaultMarkup(settings: SystemSettings, printCost: number): number {
  return printCost * (settings.default_markup / 100);
}

function calcAuthorMarkup(
  markupType: "percentage" | "flat",
  markupValue: number,
  baseCost: number
): number {
  if (markupType === "flat") return markupValue;
  return baseCost * (markupValue / 100);
}

function roundUp100(n: number): number {
  return Math.ceil(n / 100) * 100;
}

interface PriceBreakdown {
  printCost: number;
  platformFee: number;
  defaultMarkup: number;
  baseCost: number;       // printCost + platformFee + defaultMarkup  (minimum sell price)
  authorMarkup: number;
  finalPrice: number;     // baseCost + authorMarkup  (what buyer pays)
}

function buildBreakdown(
  settings: SystemSettings,
  format: "paperback" | "hardcover",
  size: string,
  pageCount: number,
  markupType: "percentage" | "flat",
  markupValue: number,
  flapType: "none" | "single" | "double" = "none",
  specialAddonFee = 0
): PriceBreakdown {
  const printCost     = calcPrintCost(settings, format, size, pageCount, flapType, specialAddonFee);
  const platformFee   = calcPlatformFee(settings, printCost);
  const defaultMarkup = calcDefaultMarkup(settings, printCost);
  const baseCost      = printCost + platformFee + defaultMarkup;
  const authorMarkup  = calcAuthorMarkup(markupType, markupValue, baseCost);
  const rawFinal = baseCost + authorMarkup;
  const finalPrice = roundUp100(baseCost + authorMarkup);
  return { printCost, platformFee, defaultMarkup, baseCost, authorMarkup, finalPrice };
}

// ─────────────────────────────────────────────────────────────────────────────
// UploadField  (defined outside — avoids remount / focus-loss bug)
// ─────────────────────────────────────────────────────────────────────────────

interface UploadState {
  progress: number;
  url: string;
  loading: boolean;
}

function createInitialUploads(book?: Book): Record<string, UploadState> {
  return {
    front:  { progress: 0, url: book?.book_cover  || "", loading: false },
    back:   { progress: 0, url: book?.book_cover2 || "", loading: false },
    spine:  { progress: 0, url: book?.book_cover3 || "", loading: false },
    spread: { progress: 0, url: book?.book_cover4 || "", loading: false },
    pdf:    { progress: 0, url: book?.pdf_url     || "", loading: false },
    docx:   { progress: 0, url: book?.text_url    || "", loading: false },
  };
}

function createBookFormDefaults({
  book,
  sessionAuthorId,
  sessionPublisherId,
  initialPrices,
}: {
  book?: Book;
  sessionAuthorId?: string | null;
  sessionPublisherId?: string | null;
  initialPrices: { paperback?: number; hardcover?: number; ebook?: number };
}): DefaultValues<TCreateBookSchema> {
  return {
    title:             book?.title            ?? "",
    subtitle:          (book as any)?.subtitle ?? "",
    isbn:              (book as any)?.isbn ?? "",
    publication_date:  (book as any)?.publication_date ? new Date((book as any).publication_date) : undefined,
    default_language:  normalizeBookLanguageValue((book as any)?.default_language),
    short_description: book?.short_description ?? "",
    long_description:  book?.long_description  ?? "",
    page_count:        book?.page_count        ?? 0,
    author_id:         book?.author_id         ?? sessionAuthorId ?? "",
    publisher_id:      book?.publisher_id      ?? sessionPublisherId ?? "",
    category_ids:      (book as any)?.categories?.map((c: any) => c.id) ?? [],
    paper_back:        book?.paper_back ?? false,
    e_copy:            book?.e_copy     ?? true,
    hard_cover:        book?.hard_cover ?? false,
    paperback_price:   initialPrices.paperback,
    ebook_price:       initialPrices.ebook,
    hardcover_price:   initialPrices.hardcover,
    size:              (book as any)?.variants?.[0]?.size_bucket || (book as any)?.variants?.[0]?.size || "A5",
    trim_size_mode:    (book as any)?.variants?.[0]?.trim_size_mode || "standard",
    paper_type:        (book as any)?.variants?.[0]?.paper_type || "cream",
    lamination_type:   (book as any)?.variants?.[0]?.lamination_type || "matte",
    flap_type:         (book as any)?.variants?.[0]?.flap_type || "none",
    custom_width_in:   (book as any)?.variants?.[0]?.custom_width_in ?? null,
    custom_height_in:  (book as any)?.variants?.[0]?.custom_height_in ?? null,
    size_bucket:       (book as any)?.variants?.[0]?.size_bucket || (book as any)?.variants?.[0]?.size || "A5",
    display_width_in:  (book as any)?.variants?.[0]?.display_width_in ?? null,
    display_height_in: (book as any)?.variants?.[0]?.display_height_in ?? null,
    author_markup_type:  "percentage",
    author_markup_value: 0,
    special_addon_fee:  (book as any)?.special_addon_fee ?? 0,
    special_addon_description: (book as any)?.special_addon_description ?? "",
    custom_fields:      (book as any)?.metadata?.custom_fields ?? {},
    admin_private_notes: (book as any)?.metadata?.private_creator_notes ?? "",
  };
}

interface UploadFieldProps {
  label: string;
  type: string;
  uploads: Record<string, UploadState>;
  onUpload: (file: File, type: string) => void;
  accept: string;
}

async function getPdfPageCount(file: File): Promise<number | null> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes  = new Uint8Array(buffer);
    const text   = new TextDecoder("latin1").decode(bytes);

    // Strategy: find /Type /Pages node that is the document root.
    // The root Pages dict always has /Type /Pages and /Count N
    // as siblings in the same dictionary block.
    // We look for the pattern: /Type /Pages ... /Count N
    // within a reasonable proximity (same dict object).

    // Split on "obj" boundaries to isolate individual PDF objects
    const objPattern = /\d+\s+\d+\s+obj([\s\S]*?)endobj/g;
    const candidates: number[] = [];

    let match: RegExpExecArray | null;
    while ((match = objPattern.exec(text)) !== null) {
      const body = match[1];
      // Only look in objects that declare themselves as /Type /Pages
      if (!/\/Type\s*\/Pages/.test(body)) continue;
      // Extract /Count from this specific object
      const countMatch = body.match(/\/Count\s+(\d+)/);
      if (countMatch) {
        candidates.push(parseInt(countMatch[1], 10));
      }
    }

    if (!candidates.length) return null;

    // The root Pages node has the highest count (sum of all children)
    return Math.max(...candidates);
  } catch {
    return null;
  }
}

type NumericInputProps = Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  value: number | string | null | undefined;
  emptyValue?: null | undefined;
  onValueChange: (value: number | string | null | undefined) => void;
};

function NumericInput({
  value,
  emptyValue = undefined,
  onValueChange,
  ...props
}: NumericInputProps) {
  const [displayValue, setDisplayValue] = useState(
    value === null || value === undefined ? "" : String(value)
  );

  useEffect(() => {
    const nextValue = value === null || value === undefined ? "" : String(value);
    setDisplayValue((current) => (current === nextValue ? current : nextValue));
  }, [value]);

  return (
    <Input
      type="number"
      {...props}
      value={displayValue}
      onChange={(e) => {
        const raw = e.target.value;
        setDisplayValue(raw);
        onValueChange(raw === "" ? emptyValue : Number(raw));
      }}
    />
  );
}

function UploadField({ label, type, uploads, onUpload, accept }: UploadFieldProps) {
  const data = uploads[type];
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black uppercase text-gray-500">{label}</label>
      <div
        className={cn(
          "border-2 border-dashed border-black h-16 flex flex-col items-center justify-center cursor-pointer bg-secondary/10 transition-colors hover:bg-white",
          data?.url && "border-green-600 bg-green-50"
        )}
        onClick={() => document.getElementById(`upload-${type}`)?.click()}
      >
        <input
          id={`upload-${type}`}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file, type);
          }}
        />
        {data?.loading ? (
          <div className="w-full px-4">
            <div className="h-1 bg-gray-200 w-full rounded-full overflow-hidden">
              <div
                className="h-full bg-black transition-all duration-300"
                style={{ width: `${data.progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-[10px] font-black uppercase italic text-center px-2">
            {data?.url ? (
              <span className="text-green-700 flex items-center gap-1">
                <CheckCircle2 size={12} /> Uploaded
              </span>
            ) : (
              <span className="flex items-center gap-1 opacity-50">
                <UploadCloud size={12} /> {label}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PricingBreakdownCard  (defined outside)
// ─────────────────────────────────────────────────────────────────────────────

interface PricingBreakdownCardProps {
  breakdown: PriceBreakdown;
  format: "paperback" | "hardcover";
  platformFeeType: "percentage" | "flat";
  platformFeeValue: number;
  defaultMarkupPct: number;
}

function PricingBreakdownCard({
  breakdown,
  platformFeeType,
  platformFeeValue,
  defaultMarkupPct,
}: PricingBreakdownCardProps) {
  const fmt = (n: number) => `₦${Math.ceil(n).toLocaleString()}`;
  const authorEarnings = breakdown.finalPrice - breakdown.printCost - breakdown.platformFee;

  return (
    <div className="border-2 border-black bg-[#f9f6f0] p-4 space-y-3 text-xs font-mono">
      <p className="text-[9px] font-black uppercase tracking-widest opacity-50 flex items-center gap-1">
        <Info size={10} /> Pricing Breakdown
      </p>

      {/* Cost stack */}
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="opacity-60">Print cost</span>
          <span className="font-bold text-red-600">−{fmt(breakdown.printCost)}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-60">
            Platform fee ({platformFeeType === "percentage" ? `${platformFeeValue}%` : "flat"})
          </span>
          <span className="font-bold text-red-600">−{fmt(breakdown.platformFee)}</span>
        </div>
        <div className="flex justify-between border-t border-black/10 pt-1.5">
          <span className="opacity-80 font-bold">Min. sell price</span>
          <span className="font-bold">{fmt(breakdown.baseCost)}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-60">
            Platform default markup ({defaultMarkupPct}%)
          </span>
          <span className="font-bold text-emerald-600">+{fmt(breakdown.defaultMarkup)}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-60">Your markup</span>
          <span className="font-bold text-emerald-600">+{fmt(breakdown.authorMarkup)}</span>
        </div>
      </div>

      {/* Final price */}
      <div className="border-t-2 border-black pt-3 flex justify-between items-center">
        <span className="font-black uppercase text-[10px] tracking-widest">Sell price</span>
        <span className="font-black text-lg tracking-tight">{fmt(breakdown.finalPrice)}</span>
      </div>

      {/* Author earnings */}
      <div className="bg-emerald-50 border border-emerald-300 px-3 py-2 flex justify-between items-center">
        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
          <TrendingUp size={10} /> Your net earnings / copy
        </span>
        <span className="font-black text-emerald-700">{fmt(authorEarnings)}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const BookForm = ({ book, action, trigger }: BookFormProps) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [payoutPromptOpen, setPayoutPromptOpen] = useState(false);
  const session = useSession();
  const sessionAuthorId = (session.data?.user as any)?.author_id;
  const sessionPublisherId = (session.data?.user as any)?.publisher_id;
  const activeProfile = session.data?.activeProfile;
  const isAddFlow = action === "Add";
  const shouldCheckPayoutGate = isAddFlow && (activeProfile === "publisher" || activeProfile === "author");

  const { data: authors } = trpc.getAuthorsByUser.useQuery(
    { id: session.data?.user.id as string },
    { enabled: !!session.data?.user.id && !sessionAuthorId }
  );

  const { data: categories } = trpc.getCategories.useQuery();
  const { data: systemSettings } = trpc.getSystemSettings.useQuery();
  const { data: addBookPayoutGate, isLoading: addBookPayoutGateLoading } =
    trpc.getBookCreationPayoutStatus.useQuery(
      { publisher_id: sessionPublisherId || undefined },
      { enabled: !!session.data?.user.id && shouldCheckPayoutGate }
    );

  // Tracks which ebook file type was uploaded so the other is disabled
  const [ebookUploadedType, setEbookUploadedType] = useState<"pdf" | "docx" | null>(
    // Pre-fill in edit mode
    book?.pdf_url ? "pdf" : book?.text_url ? "docx" : null
  );
 
  // Tracks whether page count was auto-detected from PDF
  const [pageCountAutoDetected, setPageCountAutoDetected] = useState(false);

  // ── Initial prices from existing variants (edit mode) ──────────────────────
  const initialPrices = useMemo(() => {
    if (book && (book as any).variants) {
      const variants = (book as any).variants || [];
      const prices: { paperback?: number; hardcover?: number; ebook?: number } = {};
      variants.forEach((v: any) => {
        if (v.format === "paperback") prices.paperback = v.list_price;
        if (v.format === "ebook")     prices.ebook     = v.list_price;
        if (v.format === "hardcover") prices.hardcover = v.list_price;
      });
      return prices;
    }
    return {
      paperback: (book as any)?.price || 0,
      ebook:     (book as any)?.price || 0,
      hardcover: (book as any)?.price || 0,
    };
  }, [book]);

  // ── Upload state ────────────────────────────────────────────────────────────
  const initialUploads = useMemo(() => createInitialUploads(book), [book]);
  const [uploads, setUploads] = useState<Record<string, UploadState>>(initialUploads);
  const defaultFormValues = useMemo(
    () =>
      createBookFormDefaults({
        book,
        sessionAuthorId,
        sessionPublisherId,
        initialPrices,
      }),
    [book, sessionAuthorId, sessionPublisherId, initialPrices]
  );

  // ── Form ────────────────────────────────────────────────────────────────────
  const form = useForm<TCreateBookSchema>({
    resolver: zodResolver(createBookSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (!open) return;

    form.reset(defaultFormValues);
    setUploads(initialUploads);
    setEbookUploadedType(book?.pdf_url ? "pdf" : book?.text_url ? "docx" : null);
    setPageCountAutoDetected(false);
  }, [open, form, defaultFormValues, initialUploads, book]);

  const watched = useWatch({ control: form.control });
  const selectedAuthorIdForGate = isAddFlow
    ? ((watched.author_id as string | undefined) || sessionAuthorId || undefined)
    : undefined;
  const { data: selectedAuthorPayoutGate, isLoading: selectedAuthorPayoutGateLoading } = trpc.getBookCreationPayoutStatus.useQuery(
    {
      author_id: selectedAuthorIdForGate,
      publisher_id: sessionPublisherId || undefined,
    },
    {
      enabled:
        !!session.data?.user.id
        && shouldCheckPayoutGate
        && activeProfile === "publisher"
        && !!selectedAuthorIdForGate
        && !!open,
    }
  );
  const bookFeatureToggles = systemSettings?.book_feature_toggles;
  const customFieldDefinitions = useMemo(
    () => normalizeBookCustomFields(systemSettings?.book_custom_fields ?? []),
    [systemSettings?.book_custom_fields]
  );
  const activePayoutGate = activeProfile === "publisher" && selectedAuthorPayoutGate
    ? selectedAuthorPayoutGate
    : addBookPayoutGate;
  const payoutSubmitBlockers = (activePayoutGate?.blocking_entities_for_submit ?? []) as PayoutGateEntity[];
  const payoutOpenBlockers = (addBookPayoutGate?.blocking_entities_for_open ?? []) as PayoutGateEntity[];
  const isPayoutGateBusy =
    shouldCheckPayoutGate
    && (addBookPayoutGateLoading || (activeProfile === "publisher" && !!selectedAuthorIdForGate && !!open && selectedAuthorPayoutGateLoading));
  const isSubmitBlockedByPayout =
    !!(shouldCheckPayoutGate && activePayoutGate && !activePayoutGate.can_submit_with_selected_author);
  const matchedSizeBucket = useMemo(() => {
    if (!(watched.paper_back || watched.hard_cover)) return null;
    if (watched.trim_size_mode !== "custom") return (watched.size || "A5") as "A6" | "A5" | "A4";
    if (!watched.custom_width_in || !watched.custom_height_in || !systemSettings) return null;
    return matchSizeBucket(
      Number(watched.custom_width_in),
      Number(watched.custom_height_in),
      systemSettings.book_size_ranges
    );
  }, [
    watched.paper_back,
    watched.hard_cover,
    watched.trim_size_mode,
    watched.size,
    watched.custom_width_in,
    watched.custom_height_in,
    systemSettings,
  ]);

  useEffect(() => {
    if (!(watched.paper_back || watched.hard_cover)) return;
    if (watched.trim_size_mode === "custom") {
      form.setValue("size_bucket", matchedSizeBucket ?? undefined);
      form.setValue("display_width_in", watched.custom_width_in ?? null);
      form.setValue("display_height_in", watched.custom_height_in ?? null);
      return;
    }

    const standardSize = (watched.size || "A5") as "A6" | "A5" | "A4";
    form.setValue("size_bucket", standardSize);
    form.setValue("display_width_in", STANDARD_SIZE_DIMENSIONS_IN[standardSize].width);
    form.setValue("display_height_in", STANDARD_SIZE_DIMENSIONS_IN[standardSize].height);
  }, [
    watched.paper_back,
    watched.hard_cover,
    watched.trim_size_mode,
    watched.size,
    watched.custom_width_in,
    watched.custom_height_in,
    matchedSizeBucket,
    form,
  ]);

  // ── Upload handler ──────────────────────────────────────────────────────────
  const handleInstantUpload = async (file: File, type: string) => {
    setUploads((prev) => ({ ...prev, [type]: { ...prev[type], loading: true, progress: 0 } }));
    try {
      const blob = await uploadFileToBlob(file, {
        category: type === "pdf" || type === "docx" ? "document" : "image",
        purpose: type === "pdf" || type === "docx" ? "book-files" : "book-assets",
        onUploadProgress: ({ percentage }) => {
          setUploads((prev) => ({
            ...prev,
            [type]: { ...prev[type], progress: Math.round(percentage) },
          }));
        },
      });
      setUploads((prev) => ({ ...prev, [type]: { ...prev[type], url: blob.url, loading: false, progress: 100 } }));
    } catch (error) {
      setUploads((prev) => ({ ...prev, [type]: { ...prev[type], loading: false, progress: 0 } }));
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Could not upload asset.",
      });
    }
  };

  // ── Compute pricing breakdowns ──────────────────────────────────────────────
  const physicalFormat: "paperback" | "hardcover" | null = watched.paper_back
    ? "paperback"
    : watched.hard_cover
    ? "hardcover"
    : null;

  const pbBreakdown = useMemo<PriceBreakdown | null>(() => {
    if (!systemSettings || !watched.paper_back || !watched.page_count || watched.page_count <= 0 || !matchedSizeBucket) return null;
    return buildBreakdown(
      systemSettings as SystemSettings,
      "paperback",
      matchedSizeBucket,
      watched.page_count,
      (watched.author_markup_type as any) || "percentage",
      watched.author_markup_value || 0,
      (watched.flap_type as any) || "none",
      watched.special_addon_fee || 0
    );
  }, [systemSettings, watched.paper_back, watched.page_count, matchedSizeBucket, watched.author_markup_type, watched.author_markup_value, watched.flap_type, watched.special_addon_fee]);

  const hcBreakdown = useMemo<PriceBreakdown | null>(() => {
    if (!systemSettings || !watched.hard_cover || !watched.page_count || watched.page_count <= 0 || !matchedSizeBucket) return null;
    return buildBreakdown(
      systemSettings as SystemSettings,
      "hardcover",
      matchedSizeBucket,
      watched.page_count,
      (watched.author_markup_type as any) || "percentage",
      watched.author_markup_value || 0,
      (watched.flap_type as any) || "none",
      watched.special_addon_fee || 0
    );
  }, [systemSettings, watched.hard_cover, watched.page_count, matchedSizeBucket, watched.author_markup_type, watched.author_markup_value, watched.flap_type, watched.special_addon_fee]);

  // ── Sync computed prices back into the form fields ──────────────────────────
  useEffect(() => {
    if (pbBreakdown) form.setValue("paperback_price", pbBreakdown.finalPrice);
  }, [pbBreakdown, form]);

  useEffect(() => {
    if (hcBreakdown) form.setValue("hardcover_price", hcBreakdown.finalPrice);
  }, [hcBreakdown, form]);

  // ── Form validity ───────────────────────────────────────────────────────────
  const isFormValid = useMemo(() => {
    const hasBaseInfo   = !!(watched.title && watched.author_id && watched.long_description);
    const hasFormat     = !!(watched.e_copy || watched.paper_back || watched.hard_cover);
    const frontUploaded = !!uploads.front.url;
    const isAnyLoading  = Object.values(uploads).some((u) => u.loading);

    if (!hasBaseInfo || !hasFormat || isAnyLoading || !frontUploaded) return false;

    if (watched.e_copy) {
      const docUploaded = !!(uploads.pdf.url || uploads.docx.url);
      if (!docUploaded || watched.ebook_price === undefined || watched.ebook_price === null || watched.ebook_price < 0) return false;
    }
    if (watched.paper_back || watched.hard_cover) {
      if (!uploads.pdf.url || !watched.page_count || watched.page_count <= 0) return false;
      if (watched.trim_size_mode === "custom") {
        if (!watched.custom_width_in || !watched.custom_height_in || !matchedSizeBucket) return false;
      } else if (!watched.size) {
        return false;
      }
    }
    return true;
  }, [watched, uploads, matchedSizeBucket]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const { mutate: submitBook, isPending } =
    trpc[action === "Add" ? "createBook" : "updateBook"].useMutation({
      onSuccess: () => {
        toast({
          title: "Success",
          description: `Product ${action === "Add" ? "published" : "updated"} successfully.`,
        });
        Promise.all([utils.getAllBooks.invalidate(), utils.getBookByAuthor.invalidate()]).then(
          () => {
            if (action === "Add") {
              form.reset(defaultFormValues);
              setUploads(initialUploads);
              setEbookUploadedType(null);
              setPageCountAutoDetected(false);
              setPayoutPromptOpen(false);
            }
            setOpen(false);
          }
        );
      },
      onError: (err) =>
        toast({ variant: "destructive", title: "Could not save book", description: getFriendlyBookError(err.message) }),
    });

  // ── Submit ──────────────────────────────────────────────────────────────────
  const onFinalSubmit = (values: TCreateBookSchema) => {
    if (!uploads.front.url) {
      toast({ variant: "destructive", title: "Missing Cover", description: "Front cover is required." });
      return;
    }
    if (values.e_copy && !uploads.pdf.url && !uploads.docx.url) {
      toast({ variant: "destructive", title: "Missing e-book file", description: "Upload a PDF or DOCX for the e-book." });
      return;
    }
    if ((values.paper_back || values.hard_cover) && !uploads.pdf.url) {
      toast({ variant: "destructive", title: "Missing print PDF", description: "Upload the print-ready PDF for your physical book." });
      return;
    }
    const finalAuthorId = values.author_id || sessionAuthorId;
    if (!finalAuthorId) {
      toast({ variant: "destructive", title: "Missing author", description: "Please choose the author for this book." });
      return;
    }
    if (isPayoutGateBusy) {
      toast({
        title: "Checking payout setup",
        description: "Please wait while we confirm the payout status for this creator.",
      });
      return;
    }
    if (isSubmitBlockedByPayout) {
      toast({
        variant: "destructive",
        title: "Complete payout setup first",
        description: payoutSubmitBlockers.map((entity) => `${entity.display_name}: ${entity.blocking_reason_labels.join(" ")}`).join(" "),
      });
      return;
    }

    const payload = {
      ...values,
      id:          book?.id,
      author_id:   finalAuthorId,
      book_cover:  uploads.front.url  || null,
      book_cover2: (values.paper_back || values.hard_cover) ? (uploads.back.url   || null) : null,
      book_cover3: (values.paper_back || values.hard_cover) ? (uploads.spine.url  || null) : null,
      book_cover4: (values.paper_back || values.hard_cover) ? (uploads.spread.url || null) : null,
      page_count:  (values.paper_back || values.hard_cover) ? (values.page_count  || 0)   : undefined,
      paperback_price: values.paper_back  ? values.paperback_price  : undefined,
      hardcover_price: values.hard_cover  ? values.hardcover_price  : undefined,
      pdf_url: uploads.pdf.url || null,
      text_url:    values.e_copy ? (uploads.docx.url || null) : null,
      ebook_price: values.e_copy ? values.ebook_price           : undefined,
      paper_back:  !!values.paper_back,
      hard_cover:  !!values.hard_cover,
      e_copy:      !!values.e_copy,
      admin_private_notes: values.admin_private_notes || undefined,
      size_bucket: matchedSizeBucket ?? undefined,
      display_width_in: values.display_width_in ?? undefined,
      display_height_in: values.display_height_in ?? undefined,
      price: values.e_copy
        ? (values.ebook_price     || 0)
        : (values.paperback_price || values.hardcover_price || 0),
      variants: [
        ...(values.paper_back ? [{
          format:     "paperback" as const,
          size:       matchedSizeBucket || values.size || "A5",
          size_bucket: matchedSizeBucket || values.size || "A5",
          trim_size_mode: values.trim_size_mode || "standard",
          paper_type: values.paper_type,
          lamination_type: values.lamination_type,
          flap_type: values.flap_type || "none",
          custom_width_in: values.custom_width_in ?? undefined,
          custom_height_in: values.custom_height_in ?? undefined,
          display_width_in: values.display_width_in ?? undefined,
          display_height_in: values.display_height_in ?? undefined,
          list_price: values.paperback_price!,
          status:     "active"   as const,
        }] : []),
        ...(values.hard_cover ? [{
          format:     "hardcover" as const,
          size:       matchedSizeBucket || values.size || "A5",
          size_bucket: matchedSizeBucket || values.size || "A5",
          trim_size_mode: values.trim_size_mode || "standard",
          paper_type: values.paper_type,
          lamination_type: values.lamination_type,
          flap_type: values.flap_type || "none",
          custom_width_in: values.custom_width_in ?? undefined,
          custom_height_in: values.custom_height_in ?? undefined,
          display_width_in: values.display_width_in ?? undefined,
          display_height_in: values.display_height_in ?? undefined,
          list_price: values.hardcover_price!,
          status:     "active"   as const,
        }] : []),
        ...(values.e_copy ? [{
          format:     "ebook"  as const,
          list_price: values.ebook_price!,
          status:     "active" as const,
        }] : []),
      ],
    };

      submitBook(payload as any);
  };

  const openBookForm = () => {
    if (!isAddFlow || !shouldCheckPayoutGate) {
      setOpen(true);
      return;
    }

    if (addBookPayoutGateLoading) {
      toast({
        title: "Checking payout setup",
        description: "Please wait a moment while we confirm your payout readiness.",
      });
      return;
    }

    if (addBookPayoutGate && !addBookPayoutGate.can_open_add_book) {
      setPayoutPromptOpen(true);
      return;
    }

    setOpen(true);
  };

  const handleFormError = (errors: any) => {
    const errorEntries = Object.entries(errors);
    if (!errorEntries.length) return;
    const [field, error] = errorEntries[0] as [string, any];
    if (field === "page_count"      && !watched.paper_back && !watched.hard_cover) return;
    if (field === "ebook_price"     && !watched.e_copy)     return;
    if (field === "paperback_price" && !watched.paper_back) return;
    if (field === "hardcover_price" && !watched.hard_cover) return;
    toast({
      variant: "destructive",
      title: "Validation Error",
      description: (error as any)?.message || `Please check the ${field.replace("_", " ")} field.`,
    });
  };

  const menuButtonStyle =
    "w-full text-left px-3 py-2.5 text-xs font-black uppercase italic hover:bg-accent cursor-pointer flex items-center gap-2 transition-colors rounded-none outline-none border-none bg-transparent text-black shadow-none";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {trigger ? (
        <div onClick={openBookForm} className="contents">
          {trigger}
        </div>
      ) : (
        <Button
          type="button"
          onClick={openBookForm}
          className={cn(
            "rounded-none border-2 border-black transition-all font-black uppercase italic text-xs tracking-widest",
            action === "Edit"
              ? menuButtonStyle
              : "bg-black text-white gumroad-shadow h-14 px-8 hover:translate-x-[2px] block"
          )}
        >
          {action === "Edit" && <Edit3 size={14} />}
          {action} Book
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-none border-2 border-black p-0 bg-[#F4F4F4]">
        <div className="p-6 border-b-2 border-black bg-white sticky top-0 z-20">
          <DialogTitle className="text-2xl font-black uppercase italic">
            {action} Book
          </DialogTitle>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onFinalSubmit, handleFormError)}
            className="p-6 space-y-8"
          >
            {/* ── Section 1: Product Info ─────────────────────────────── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 bg-black text-white flex items-center justify-center font-bold">1</span>
                <h3 className="font-bold uppercase tracking-tight">Product Information</h3>
              </div>

              <div className="bg-white border-2 border-black p-6 space-y-4">
                {isAddFlow && shouldCheckPayoutGate && payoutSubmitBlockers.length > 0 && (
                  <div className="border-[1.5px] border-amber-300 bg-amber-50 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-black uppercase italic">Complete payout setup before adding this book</p>
                        <p className="text-xs font-medium text-amber-700 mt-1">
                          The current creator setup is incomplete, so this book cannot be saved yet.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {payoutSubmitBlockers.map((entity) => (
                        <div key={`${entity.entity_type}-${entity.entity_id}`} className="border border-amber-200 bg-white px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                            {entity.entity_type} · {entity.display_name}
                          </p>
                          <p className="text-xs font-medium text-black/70 mt-1">
                            {entity.blocking_reason_labels.join(" ")}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <Link
                        href="/app/settings/payment"
                        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-amber-500 text-white px-3 py-2 hover:bg-amber-600 transition-colors"
                      >
                        Set Up Payout <ArrowRight size={10} />
                      </Link>
                    </div>
                  </div>
                )}
                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs">TITLE *</FormLabel>
                      <FormControl>
                        <Input className="input-gumroad" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {bookFeatureToggles?.subtitle && (
                  <FormField
                    control={form.control}
                    name="subtitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs">SUBTITLE</FormLabel>
                        <FormControl>
                          <Input className="input-gumroad" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {bookFeatureToggles?.language && (
                    <FormField
                      control={form.control}
                      name="default_language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-xs uppercase">Language</FormLabel>
                          <Select value={field.value ?? "English"} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="input-gumroad">
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white">
                              {COMMON_BOOK_LANGUAGES.map((language) => (
                                <SelectItem key={language} value={language}>
                                  {language}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  )}

                  {bookFeatureToggles?.isbn && (
                    <FormField
                      control={form.control}
                      name="isbn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-xs uppercase">ISBN</FormLabel>
                          <FormControl>
                            <Input
                              className="input-gumroad"
                              inputMode="numeric"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}

                  {bookFeatureToggles?.publication_date && (
                    <FormField
                      control={form.control}
                      name="publication_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-xs uppercase">Publication Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              className="input-gumroad"
                              value={field.value ? new Date(field.value).toISOString().split("T")[0] : ""}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Author select (only if not already an author) */}
                {!sessionAuthorId && (
                  <FormField
                    control={form.control}
                    name="author_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs">AUTHOR *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="input-gumroad">
                              <SelectValue placeholder="Select Author" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-none border-2 border-black bg-white">
                            {authors?.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.user.first_name} {a.user.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Categories */}
                <FormField
                  control={form.control}
                  name="category_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase">Categories *</FormLabel>
                      <div className="grid grid-cols-2 gap-2 bg-white border-2 border-black p-4 max-h-40 overflow-y-auto">
                        {categories?.map((cat) => (
                          <div key={cat.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={cat.id}
                              checked={field.value?.includes(cat.id)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                field.onChange(
                                  checked
                                    ? [...current, cat.id]
                                    : current.filter((v) => v !== cat.id)
                                );
                              }}
                            />
                            <label htmlFor={cat.id} className="text-sm font-medium cursor-pointer">
                              {cat.name}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="long_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs">DESCRIPTION *</FormLabel>
                      <FormControl>
                        <Textarea className="input-gumroad min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {customFieldDefinitions.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="h-8 w-8 bg-black text-white flex items-center justify-center font-bold">+</span>
                  <h3 className="font-bold uppercase tracking-tight">Additional Information</h3>
                </div>

                <div className="bg-white border-2 border-black p-6 space-y-4">
                  {customFieldDefinitions
                    .filter((field) => field.enabled && field.show_on_creator_view !== false)
                    .map((field) => (
                      <FormField
                        key={field.key}
                        control={form.control}
                        name={`custom_fields.${field.key}` as any}
                        render={({ field: valueField }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-xs uppercase">{field.label}</FormLabel>
                            <FormControl>
                              {field.field_type === "textarea" ? (
                                <Textarea
                                  className="input-gumroad min-h-[120px]"
                                  value={(valueField.value as string) ?? ""}
                                  onChange={(e) => valueField.onChange(e.target.value)}
                                  placeholder={field.placeholder}
                                />
                              ) : field.field_type === "select" ? (
                                <Select onValueChange={valueField.onChange} value={(valueField.value as string) ?? ""}>
                                  <SelectTrigger className="input-gumroad">
                                    <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-none border-2 border-black bg-white">
                                    {(field.options ?? []).map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : field.field_type === "checkbox" ? (
                                <div className="flex items-center gap-2">
                                  <Checkbox checked={!!valueField.value} onCheckedChange={valueField.onChange} />
                                  <span className="text-sm font-medium">{field.help_text || field.label}</span>
                                </div>
                                ) : field.field_type === "number" ? (
                                  <NumericInput
                                    className="input-gumroad"
                                    value={valueField.value as number | null | undefined}
                                    onValueChange={valueField.onChange}
                                    placeholder={field.placeholder}
                                  />
                                ) : (
                                  <Input
                                    type={field.field_type === "date" ? "date" : "text"}
                                    className="input-gumroad"
                                    value={(valueField.value as string) ?? ""}
                                    onChange={(e) => valueField.onChange(e.target.value)}
                                    placeholder={field.placeholder}
                                  />
                                )}
                            </FormControl>
                            {field.help_text && (
                              <p className="text-[10px] font-medium opacity-50">{field.help_text}</p>
                            )}
                          </FormItem>
                        )}
                      />
                    ))}
                </div>
              </section>
            )}

            {/* ── Section 2: Format & Pricing ────────────────────────── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 bg-black text-white flex items-center justify-center font-bold">2</span>
                <h3 className="font-bold uppercase tracking-tight">Format &amp; Pricing</h3>
              </div>

              <div className="bg-white border-2 border-black divide-y-2 divide-black">

                {/* ── Physical formats (Paperback / Hardcover) ─────────── */}
                <div className="p-6 space-y-6">
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        disabled={bookFeatureToggles?.paperback === false || bookFeatureToggles?.physical_printing === false}
                        checked={!!watched.paper_back}
                        onCheckedChange={(v) => form.setValue("paper_back", !!v)}
                      />
                      <label className="font-bold text-sm">Paperback</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        disabled={bookFeatureToggles?.hardcover === false || bookFeatureToggles?.physical_printing === false}
                        checked={!!watched.hard_cover}
                        onCheckedChange={(v) => form.setValue("hard_cover", !!v)}
                      />
                      <label className="font-bold text-sm">Hardcover</label>
                    </div>
                  </div>

                  {(watched.paper_back || watched.hard_cover) && (
                    <div className="space-y-6 pl-6 border-l-2 border-black animate-in fade-in slide-in-from-top-2">

                      {/* Size + Page count row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField
                          control={form.control}
                          name="trim_size_mode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase">Trim Size Mode *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="input-gumroad">
                                    <SelectValue placeholder="Select Size Mode" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-none border-2 border-black bg-white">
                                  <SelectItem value="standard">Standard Size</SelectItem>
                                  <SelectItem value="custom">Custom Size</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="size"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase">Book Size *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="input-gumroad" disabled={watched.trim_size_mode === "custom"}>
                                    <SelectValue placeholder="Select Size" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-none border-2 border-black bg-white">
                                  <SelectItem value="A6">A6 — 4.10 x 5.80 in</SelectItem>
                                  <SelectItem value="A5">A5 — 5.83 x 8.27 in</SelectItem>
                                  <SelectItem value="A4">A4 — 8.27 x 11.69 in</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="page_count"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase">Page Count *</FormLabel>
                              <FormControl>
                                  <NumericInput
                                    className="input-gumroad"
                                    value={field.value}
                                    emptyValue={null}
                                    onValueChange={field.onChange}
                                  />
                              </FormControl>
                              <p className="flex items-start gap-1 text-[9px] text-gray-500 leading-relaxed">
                                <Info size={11} className="mt-[1px] shrink-0" />
                                This is automatically populated when you upload the PDF. Please confirm it before submitting.
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {watched.trim_size_mode === "custom" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="custom_width_in"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase">Custom Width (in)</FormLabel>
                                <FormControl>
                                    <NumericInput
                                      className="input-gumroad"
                                      value={field.value}
                                      emptyValue={null}
                                      onValueChange={field.onChange}
                                    />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="custom_height_in"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase">Custom Height (in)</FormLabel>
                                <FormControl>
                                    <NumericInput
                                      className="input-gumroad"
                                      value={field.value}
                                      emptyValue={null}
                                      onValueChange={field.onChange}
                                    />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField
                          control={form.control}
                          name="paper_type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase">Paper Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="input-gumroad"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent className="rounded-none border-2 border-black bg-white">
                                  <SelectItem value="cream">Cream</SelectItem>
                                  <SelectItem value="white">White</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="lamination_type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase">Lamination</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="input-gumroad"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent className="rounded-none border-2 border-black bg-white">
                                  <SelectItem value="matte">Matte</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        {bookFeatureToggles?.flap !== false && (
                          <FormField
                            control={form.control}
                            name="flap_type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase">Flaps</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger className="input-gumroad"><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent className="rounded-none border-2 border-black bg-white">
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="single">Single Flap</SelectItem>
                                    <SelectItem value="double">Double Flap</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      <div className="border-2 border-black bg-[#f9f6f0] p-4 text-xs font-bold">
                        <p className="uppercase text-[10px] tracking-widest opacity-40">Calculated Size Bucket</p>
                        <p className="mt-2">
                          {matchedSizeBucket
                            ? `${matchedSizeBucket} · ${formatDimensionsInches(watched.display_width_in ?? undefined, watched.display_height_in ?? undefined) ?? "—"}`
                            : watched.trim_size_mode === "custom"
                            ? "No matching size bucket yet. Adjust the custom dimensions."
                            : watched.size || "A5"}
                        </p>
                      </div>

                      {/* Author markup row */}
                      {!!systemSettings && Number(watched.page_count ?? 0) > 0 && (
                        <div className="space-y-4">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-50">
                            Your Markup
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name="author_markup_type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase">Markup Type</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value as string}>
                                    <FormControl>
                                      <SelectTrigger className="input-gumroad">
                                        <SelectValue placeholder="Type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="rounded-none border-2 border-black bg-white">
                                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                                      <SelectItem value="flat">Fixed Amount (₦)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="author_markup_value"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase">
                                    {watched.author_markup_type === "flat" ? "Amount (₦)" : "Percentage (%)"}
                                  </FormLabel>
                                  <FormControl>
                                      <NumericInput
                                        className="input-gumroad"
                                        min={0}
                                        value={field.value}
                                        onValueChange={field.onChange}
                                      />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}

                      {/* Pricing breakdown cards */}
                      {pbBreakdown && watched.paper_back && (
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Paperback</p>
                          <PricingBreakdownCard
                            breakdown={pbBreakdown}
                            format="paperback"
                            platformFeeType={systemSettings!.platform_fee.type}
                            platformFeeValue={systemSettings!.platform_fee.value}
                            defaultMarkupPct={systemSettings!.default_markup as number}
                          />
                        </div>
                      )}

                      {hcBreakdown && watched.hard_cover && (
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Hardcover</p>
                          <PricingBreakdownCard
                            breakdown={hcBreakdown}
                            format="hardcover"
                            platformFeeType={systemSettings!.platform_fee.type}
                            platformFeeValue={systemSettings!.platform_fee.value}
                            defaultMarkupPct={systemSettings!.default_markup as number}
                          />
                        </div>
                      )}

                      {/* Final prices (read-only, auto-computed) */}
                      {(pbBreakdown || hcBreakdown) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          {watched.paper_back && (
                            <FormField
                              control={form.control}
                              name="paperback_price"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase">
                                    Paperback Sell Price (₦)
                                  </FormLabel>
                                  <FormControl>
                                    <NumericInput
                                      className="input-gumroad bg-gray-50"
                                      min={0}
                                      value={field.value}
                                      emptyValue={null}
                                      onValueChange={field.onChange}
                                    />
                                  </FormControl>
                                  <p className="text-[9px] opacity-40 font-medium">
                                    Auto-calculated. You can override.
                                  </p>
                                </FormItem>
                              )}
                            />
                          )}
                          {watched.hard_cover && (
                            <FormField
                              control={form.control}
                              name="hardcover_price"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase">
                                    Hardcover Sell Price (₦)
                                  </FormLabel>
                                  <FormControl>
                                    <NumericInput
                                      className="input-gumroad bg-gray-50"
                                      min={0}
                                      value={field.value}
                                      emptyValue={null}
                                      onValueChange={field.onChange}
                                    />
                                  </FormControl>
                                  <p className="text-[9px] opacity-40 font-medium">
                                    Auto-calculated. You can override.
                                  </p>
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── E-Copy ────────────────────────────────────────────── */}
                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={!!watched.e_copy}
                      onCheckedChange={(v) => form.setValue("e_copy", !!v)}
                    />
                    <label className="font-bold text-sm">E-Copy (Digital)</label>
                  </div>

                  {watched.e_copy && (
                    <div className="pl-6 border-l-2 border-black animate-in fade-in slide-in-from-top-2">
                      <FormField
                        control={form.control}
                        name="ebook_price"
                        render={({ field }) => (
                          <FormItem className="max-w-[200px]">
                            <FormLabel className="text-[10px] font-black uppercase">
                              E-Copy Price (₦) *
                            </FormLabel>
                            <FormControl>
                                <NumericInput
                                  className="input-gumroad"
                                  min={0}
                                  value={field.value}
                                  emptyValue={null}
                                  onValueChange={field.onChange}
                                />
                            </FormControl>
                            <p className="text-[10px] text-gray-500">
                              Set this to 0 if you want the e-book to be free.
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── Section 3: Content & Media ─────────────────────────── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 bg-black text-white flex items-center justify-center font-bold">3</span>
                <h3 className="font-bold uppercase tracking-tight">Content &amp; Media</h3>
              </div>
 
              <div className="bg-white border-2 border-black p-6 space-y-8">
 
                {/* Front cover — always shown */}
                <UploadField
                  label="Main Front Cover (Mandatory) *"
                  type="front"
                  uploads={uploads}
                  onUpload={handleInstantUpload}
                  accept="image/*"
                />
 
                {/* Physical book covers */}
                {(watched.paper_back || watched.hard_cover) && (
                  <div className="space-y-6 border-t-2 border-black pt-6 animate-in fade-in">
 
                    {/* Optional cover images */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <UploadField label="Back Cover"        type="back"   uploads={uploads} onUpload={handleInstantUpload} accept="image/*" />
                      <UploadField label="Spine"             type="spine"  uploads={uploads} onUpload={handleInstantUpload} accept="image/*" />
                      <UploadField label="Full Cover Spread" type="spread" uploads={uploads} onUpload={handleInstantUpload} accept="image/*" />
                    </div>
 
                    {/* Physical book PDF — for print-ready file + page count detection */}
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-500">
                          Print-Ready PDF (Required)
                        </label>
                        <p className="text-[9px] text-gray-400 leading-relaxed">
                          Upload the PDF file that should be printed for this book. We&apos;ll also use it
                          to detect page count and calculate print pricing.
                        </p>
                      </div>
 
                      <div
                        className={cn(
                          "border-2 border-dashed border-black h-16 flex flex-col items-center justify-center cursor-pointer bg-secondary/10 transition-colors hover:bg-white",
                          uploads["pdf"]?.url && "border-green-600 bg-green-50"
                        )}
                        onClick={() => document.getElementById("upload-pdf")?.click()}
                      >
                        <input
                          id="upload-pdf"
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
 
                            // Start upload
                            handleInstantUpload(file, "pdf");
 
                            // Simultaneously scan for page count
                            const detected = await getPdfPageCount(file);
                            if (detected && detected > 0) {
                              form.setValue("page_count", detected, { shouldValidate: true });
                              setPageCountAutoDetected(true);
                              toast({
                                title: `${detected} pages detected`,
                                description: "Page count updated automatically from your PDF.",
                              });
                            }
                          }}
                        />
                        {uploads["pdf"]?.loading ? (
                          <div className="w-full px-4 space-y-2">
                            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                              <span>Uploading PDF...</span>
                              <span>{Math.max(1, uploads["pdf"].progress)}%</span>
                            </div>
                            <div className="h-1 bg-gray-200 w-full rounded-full overflow-hidden">
                              <div
                                className="h-full bg-black transition-all duration-300"
                                style={{ width: `${uploads["pdf"].progress}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] font-black uppercase italic text-center px-2">
                            {uploads["pdf"]?.url ? (
                              <span className="text-green-700 flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                Uploaded
                                {pageCountAutoDetected && (
                                  <span className="ml-2 text-black opacity-50 not-italic normal-case font-bold">
                                    · page count auto-filled
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 opacity-50">
                                <UploadCloud size={12} /> Upload Print PDF
                              </span>
                            )}
                          </div>
                        )}
                      </div>
 
                      {/* Allow clearing / re-uploading */}
                      {uploads["pdf"]?.url && (
                        <button
                          type="button"
                          className="text-[9px] font-black uppercase underline opacity-40 hover:opacity-100"
                          onClick={() => {
                            setUploads(prev => ({ ...prev, pdf: { progress: 0, url: "", loading: false } }));
                            setPageCountAutoDetected(false);
                          }}
                        >
                          Remove PDF
                        </button>
                      )}
                    </div>
                  </div>
                )}
 
                {/* Ebook uploads — mutually exclusive PDF / DOCX */}
                {watched.e_copy && (
                  <div className="space-y-4 border-t-2 border-black pt-6 animate-in fade-in">
 
                    {/* PDF option */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-black uppercase text-gray-500">
                          PDF File
                          {ebookUploadedType === "docx" && (
                            <span className="ml-2 text-amber-600 normal-case not-italic font-bold">
                              — disabled (DOCX already uploaded)
                            </span>
                          )}
                        </label>
                        {ebookUploadedType === "pdf" && (
                          <button
                            type="button"
                            className="text-[9px] font-black uppercase underline opacity-40 hover:opacity-100 hover:text-red-600"
                            onClick={() => {
                              setUploads(prev => ({ ...prev, pdf: { progress: 0, url: "", loading: false } }));
                              setEbookUploadedType(null);
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
 
                      <div
                        className={cn(
                          "border-2 border-dashed border-black h-16 flex flex-col items-center justify-center transition-colors",
                          ebookUploadedType === "docx"
                            ? "opacity-40 cursor-not-allowed bg-gray-50"
                            : "cursor-pointer bg-secondary/10 hover:bg-white",
                          uploads.pdf?.url && "border-green-600 bg-green-50"
                        )}
                        onClick={() => {
                          if (ebookUploadedType !== "docx") {
                            document.getElementById("upload-pdf")?.click();
                          }
                        }}
                      >
                        <input
                          id="upload-pdf"
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          disabled={ebookUploadedType === "docx"}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file || ebookUploadedType === "docx") return;
                            handleInstantUpload(file, "pdf");
                            setEbookUploadedType("pdf");
                          }}
                        />
                        <div className="text-[10px] font-black uppercase italic text-center px-2">
                          {uploads.pdf?.loading ? (
                            <div className="w-full space-y-2">
                              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                                <span>Uploading PDF...</span>
                                <span>{Math.max(1, uploads.pdf.progress)}%</span>
                              </div>
                              <div className="h-1 bg-gray-200 w-full rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-black transition-all duration-300"
                                  style={{ width: `${uploads.pdf.progress}%` }}
                                />
                              </div>
                            </div>
                          ) : uploads.pdf?.url ? (
                            <span className="text-green-700 flex items-center gap-1">
                              <CheckCircle2 size={12} /> PDF Uploaded
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 opacity-50">
                              <UploadCloud size={12} />
                              {ebookUploadedType === "docx" ? "Disabled — DOCX in use" : "Upload PDF"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
 
                    {/* Divider */}
                    <div className="flex items-center gap-3 py-1">
                      <div className="flex-1 h-px bg-black/10" />
                      <span className="text-[9px] font-black uppercase opacity-30">or</span>
                      <div className="flex-1 h-px bg-black/10" />
                    </div>
 
                    {/* DOCX option */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-black uppercase text-gray-500">
                          DOCX File — Web Reader
                          {ebookUploadedType === "pdf" && (
                            <span className="ml-2 text-amber-600 normal-case not-italic font-bold">
                              — disabled (PDF already uploaded)
                            </span>
                          )}
                        </label>
                        {ebookUploadedType === "docx" && (
                          <button
                            type="button"
                            className="text-[9px] font-black uppercase underline opacity-40 hover:opacity-100 hover:text-red-600"
                            onClick={() => {
                              setUploads(prev => ({ ...prev, docx: { progress: 0, url: "", loading: false } }));
                              setEbookUploadedType(null);
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
 
                      {/* DOCX helper */}
                      <div className="flex items-start gap-2 bg-[#f9f6f0] border border-black/10 p-3 mb-2">
                        <Info size={11} className="mt-0.5 shrink-0 opacity-40" />
                        <p className="text-[9px] leading-relaxed opacity-60">
                          <strong className="uppercase">Must be a .docx file</strong> (Microsoft Word format).
                          This powers our in-browser reader — customers read directly on the platform
                          without downloading. PDFs cannot be used for the web reader.
                          Export from Word, Google Docs (<em>File → Download → .docx</em>), or Pages.
                        </p>
                      </div>
 
                      <div
                        className={cn(
                          "border-2 border-dashed border-black h-16 flex flex-col items-center justify-center transition-colors",
                          ebookUploadedType === "pdf"
                            ? "opacity-40 cursor-not-allowed bg-gray-50"
                            : "cursor-pointer bg-secondary/10 hover:bg-white",
                          uploads.docx?.url && "border-green-600 bg-green-50"
                        )}
                        onClick={() => {
                          if (ebookUploadedType !== "pdf") {
                            document.getElementById("upload-docx")?.click();
                          }
                        }}
                      >
                        <input
                          id="upload-docx"
                          type="file"
                          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          className="hidden"
                          disabled={ebookUploadedType === "pdf"}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file || ebookUploadedType === "pdf") return;
 
                            // Enforce .docx — reject anything else even if browser allowed it
                            const isDOCX =
                              file.name.toLowerCase().endsWith(".docx") ||
                              file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
 
                            if (!isDOCX) {
                              toast({
                                variant: "destructive",
                                title: "Wrong file type",
                                description: "Please upload a .docx file. PDFs and other formats are not supported for the web reader.",
                              });
                              return;
                            }
 
                            handleInstantUpload(file, "docx");
                            setEbookUploadedType("docx");
                          }}
                        />
                        <div className="text-[10px] font-black uppercase italic text-center px-2">
                          {uploads.docx?.loading ? (
                            <div className="w-full space-y-2">
                              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                                <span>Uploading DOCX...</span>
                                <span>{Math.max(1, uploads.docx.progress)}%</span>
                              </div>
                              <div className="h-1 bg-gray-200 w-full rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-black transition-all duration-300"
                                  style={{ width: `${uploads.docx.progress}%` }}
                                />
                              </div>
                            </div>
                          ) : uploads.docx?.url ? (
                            <span className="text-green-700 flex items-center gap-1">
                              <CheckCircle2 size={12} /> DOCX Uploaded
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 opacity-50">
                              <UploadCloud size={12} />
                              {ebookUploadedType === "pdf" ? "Disabled — PDF in use" : "Upload .docx File"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                <div className="space-y-2 border-t-2 border-black pt-6">
                  <FormField
                    control={form.control}
                    name="admin_private_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs uppercase">
                          Other Book Notes for Admin
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            className="input-gumroad min-h-[120px]"
                            placeholder="Let us know about any other information or special feature about this book not captured above. This will only be visible to the admin team."
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <p className="text-[11px] text-gray-500">
                          This note is only visible to the admin team on the backend.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
 
              </div>
            </section>

            {/* ── Submit ─────────────────────────────────────────────── */}
            <Button
              type="submit"
              disabled={isPending || Object.values(uploads).some((u) => u.loading) || isSubmitBlockedByPayout || isPayoutGateBusy}
              className="w-full h-16 bg-[#82d236] text-black font-black uppercase text-xl rounded-none border-2 border-black gumroad-shadow hover:translate-x-[3px] transition-all disabled:opacity-50 disabled:bg-gray-200 disabled:cursor-not-allowed"
            >
              {isPending ? <Loader2 className="animate-spin" /> : `${action} Product`}
            </Button>
          </form>
        </Form>
      </DialogContent>
      </Dialog>

      <Dialog open={payoutPromptOpen} onOpenChange={setPayoutPromptOpen}>
        <DialogContent className="max-w-lg rounded-none border-2 border-black bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic">
              Set Up Payout Before Adding Books
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-black/70">
              You need a fully ready payout account before you can create new books.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {payoutOpenBlockers.map((entity) => (
              <div key={`${entity.entity_type}-${entity.entity_id}`} className="border-[1.5px] border-amber-300 bg-amber-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                  {entity.entity_type} · {entity.display_name}
                </p>
                <p className="text-sm font-medium text-black/75 mt-1">
                  {entity.blocking_reason_labels.join(" ")}
                </p>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-3 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPayoutPromptOpen(false)}
              className="rounded-none border-2 border-black font-black uppercase italic text-xs"
            >
              Close
            </Button>
            <Link
              href="/app/settings/payment"
              onClick={() => setPayoutPromptOpen(false)}
              className="inline-flex items-center justify-center gap-2 rounded-none border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase italic text-white hover:bg-accent hover:text-black transition-colors"
            >
              Set Up Payout <ArrowRight size={12} />
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BookForm;
