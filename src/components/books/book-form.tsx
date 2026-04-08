"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { createBookSchema, TCreateBookSchema } from "@/server/dtos";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import axios from "axios";
import { Loader2, CheckCircle2, UploadCloud, Edit3, TrendingUp, Info } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BookFormProps {
  book?: Book;
  action: "Add" | "Edit";
  trigger?: React.ReactNode;
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
}

function calcPrintCost(
  settings: SystemSettings,
  format: "paperback" | "hardcover",
  size: string,
  pageCount: number
): number {
  const cfg = settings.printing_costs[format]?.[size];
  if (!cfg) return 0;
  return cfg.cover + cfg.page * pageCount;
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
  markupValue: number
): PriceBreakdown {
  const printCost     = calcPrintCost(settings, format, size, pageCount);
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
  const session = useSession();
  const sessionAuthorId = (session.data?.user as any)?.author_id;

  const { data: authors } = trpc.getAuthorsByUser.useQuery(
    { id: session.data?.user.id as string },
    { enabled: !!session.data?.user.id && !sessionAuthorId }
  );

  const { data: categories } = trpc.getCategories.useQuery();
  const { data: systemSettings } = trpc.getSystemSettings.useQuery();

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
  const [uploads, setUploads] = useState<Record<string, UploadState>>({
    front:  { progress: 0, url: book?.book_cover  || "", loading: false },
    back:   { progress: 0, url: book?.book_cover2 || "", loading: false },
    spine:  { progress: 0, url: book?.book_cover3 || "", loading: false },
    spread: { progress: 0, url: book?.book_cover4 || "", loading: false },
    pdf:    { progress: 0, url: book?.pdf_url     || "", loading: false },
    docx:   { progress: 0, url: book?.text_url    || "", loading: false },
  });

  // ── Form ────────────────────────────────────────────────────────────────────
  const form = useForm<TCreateBookSchema>({
    resolver: zodResolver(createBookSchema),
    defaultValues: {
      title:             book?.title            ?? "",
      short_description: book?.short_description ?? "",
      long_description:  book?.long_description  ?? "",
      page_count:        book?.page_count        ?? 0,
      author_id:         book?.author_id         ?? sessionAuthorId ?? "",
      publisher_id:      book?.publisher_id      ?? (session.data?.user as any)?.publisher_id ?? "",
      category_ids:      (book as any)?.categories?.map((c: any) => c.id) ?? [],
      paper_back:        book?.paper_back ?? false,
      e_copy:            book?.e_copy     ?? true,
      hard_cover:        book?.hard_cover ?? false,
      paperback_price:   initialPrices.paperback,
      ebook_price:       initialPrices.ebook,
      hardcover_price:   initialPrices.hardcover,
      size:              (book as any)?.variants?.[0]?.size || "A5",
      author_markup_type:  "percentage",
      author_markup_value: 0,
    },
  });

  const watched = useWatch({ control: form.control });

  // ── Upload handler ──────────────────────────────────────────────────────────
  const handleInstantUpload = async (file: File, type: string) => {
    setUploads((prev) => ({ ...prev, [type]: { ...prev[type], loading: true, progress: 0 } }));
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await axios.post(
        `/api/avatar/upload?filename=${encodeURIComponent(file.name)}`,
        formData,
        {
          onUploadProgress: (p) => {
            setUploads((prev) => ({
              ...prev,
              [type]: { ...prev[type], progress: Math.round((p.loaded * 100) / (p.total || 1)) },
            }));
          },
        }
      );
      setUploads((prev) => ({ ...prev, [type]: { ...prev[type], url: data.url, loading: false } }));
    } catch {
      setUploads((prev) => ({ ...prev, [type]: { ...prev[type], loading: false, progress: 0 } }));
      toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload asset." });
    }
  };

  // ── Compute pricing breakdowns ──────────────────────────────────────────────
  const physicalFormat: "paperback" | "hardcover" | null = watched.paper_back
    ? "paperback"
    : watched.hard_cover
    ? "hardcover"
    : null;

  const pbBreakdown = useMemo<PriceBreakdown | null>(() => {
    if (!systemSettings || !watched.paper_back || !watched.page_count || watched.page_count <= 0) return null;
    return buildBreakdown(
      systemSettings as SystemSettings,
      "paperback",
      watched.size || "A5",
      watched.page_count,
      (watched.author_markup_type as any) || "percentage",
      watched.author_markup_value || 0
    );
  }, [systemSettings, watched.paper_back, watched.page_count, watched.size, watched.author_markup_type, watched.author_markup_value]);

  const hcBreakdown = useMemo<PriceBreakdown | null>(() => {
    if (!systemSettings || !watched.hard_cover || !watched.page_count || watched.page_count <= 0) return null;
    return buildBreakdown(
      systemSettings as SystemSettings,
      "hardcover",
      watched.size || "A5",
      watched.page_count,
      (watched.author_markup_type as any) || "percentage",
      watched.author_markup_value || 0
    );
  }, [systemSettings, watched.hard_cover, watched.page_count, watched.size, watched.author_markup_type, watched.author_markup_value]);

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
      if (!docUploaded || !watched.ebook_price || watched.ebook_price <= 0) return false;
    }
    if (watched.paper_back || watched.hard_cover) {
      if (!watched.page_count || watched.page_count <= 0) return false;
      if (!watched.size) return false;
    }
    return true;
  }, [watched, uploads]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const { mutate: submitBook, isPending } =
    trpc[action === "Add" ? "createBook" : "updateBook"].useMutation({
      onSuccess: () => {
        toast({
          title: "Success",
          description: `Product ${action === "Add" ? "published" : "updated"} successfully.`,
        });
        Promise.all([utils.getAllBooks.invalidate(), utils.getBookByAuthor.invalidate()]).then(
          () => setOpen(false)
        );
      },
      onError: (err) =>
        toast({ variant: "destructive", title: "Submission Failed", description: err.message }),
    });

  // ── Submit ──────────────────────────────────────────────────────────────────
  const onFinalSubmit = (values: TCreateBookSchema) => {
    if (!uploads.front.url) {
      toast({ variant: "destructive", title: "Missing Cover", description: "Front cover is required." });
      return;
    }
    if (values.e_copy && !uploads.pdf.url && !uploads.docx.url) {
      toast({ variant: "destructive", title: "Missing Document", description: "Upload a PDF or DOCX for the e-book." });
      return;
    }
    const finalAuthorId = values.author_id || sessionAuthorId;
    if (!finalAuthorId) {
      toast({ variant: "destructive", title: "Validation Error", description: "Author context is missing." });
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
      price: values.e_copy
        ? (values.ebook_price     || 0)
        : (values.paperback_price || values.hardcover_price || 0),
      variants: [
        ...(values.paper_back ? [{
          format:     "paperback" as const,
          size:       values.size || "A5",
          list_price: values.paperback_price!,
          status:     "active"   as const,
        }] : []),
        ...(values.hard_cover ? [{
          format:     "hardcover" as const,
          size:       values.size || "A5",
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
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
      </DialogTrigger>

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
                        checked={!!watched.paper_back}
                        onCheckedChange={(v) => form.setValue("paper_back", !!v)}
                      />
                      <label className="font-bold text-sm">Paperback</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={!!watched.hard_cover}
                        onCheckedChange={(v) => form.setValue("hard_cover", !!v)}
                      />
                      <label className="font-bold text-sm">Hardcover</label>
                    </div>
                  </div>

                  {(watched.paper_back || watched.hard_cover) && (
                    <div className="space-y-6 pl-6 border-l-2 border-black animate-in fade-in slide-in-from-top-2">

                      {/* Size + Page count row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="size"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase">Book Size *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="input-gumroad">
                                    <SelectValue placeholder="Select Size" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-none border-2 border-black bg-white">
                                  <SelectItem value="A6">A6 — Pocket (105 × 148 mm)</SelectItem>
                                  <SelectItem value="A5">A5 — Standard (148 × 210 mm)</SelectItem>
                                  <SelectItem value="A4">A4 — Large (210 × 297 mm)</SelectItem>
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
                                <Input
                                  type="number"
                                  className="input-gumroad"
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    field.onChange(val === "" ? 0 : Number(val));
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Author markup row */}
                      {systemSettings && watched.page_count && watched.page_count > 0 && (
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
                                    <Input
                                      type="number"
                                      className="input-gumroad"
                                      min={0}
                                      value={field.value ?? ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        field.onChange(val === "" ? 0 : Number(val));
                                      }}
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
                                    <Input
                                      type="number"
                                      className="input-gumroad bg-gray-50"
                                      {...field}
                                      value={field.value ?? ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        field.onChange(val === "" ? 0 : Number(val));
                                      }}
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
                                    <Input
                                      type="number"
                                      className="input-gumroad bg-gray-50"
                                      {...field}
                                      value={field.value ?? ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        field.onChange(val === "" ? 0 : Number(val));
                                      }}
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
                              <Input
                                type="number"
                                className="input-gumroad"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  field.onChange(val === "" ? 0 : Number(val));
                                }}
                              />
                            </FormControl>
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
                          Print-Ready PDF (Optional)
                        </label>
                        <p className="text-[9px] text-gray-400 leading-relaxed">
                          Upload your print-ready PDF and we&apos;ll automatically detect the page count
                          to calculate your printing cost accurately.
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
                          <div className="w-full px-4">
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
                            <Loader2 size={12} className="animate-spin" />
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
                            <Loader2 size={12} className="animate-spin" />
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
 
              </div>
            </section>

            {/* ── Submit ─────────────────────────────────────────────── */}
            <Button
              type="submit"
              disabled={isPending || Object.values(uploads).some((u) => u.loading)}
              className="w-full h-16 bg-[#82d236] text-black font-black uppercase text-xl rounded-none border-2 border-black gumroad-shadow hover:translate-x-[3px] transition-all disabled:opacity-50 disabled:bg-gray-200 disabled:cursor-not-allowed"
            >
              {isPending ? <Loader2 className="animate-spin" /> : `${action} Product`}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BookForm;