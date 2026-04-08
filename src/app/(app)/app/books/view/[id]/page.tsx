"use client";

// src/app/(app)/app/books/view/[id]/page.tsx
// Admin / staff book detail page.
// Non-staff (readers/customers) are redirected to the public reader.
// Content Links section now shows ONLY what exists and is relevant:
//   - PDF book    → "Download PDF" only (no reader link)
//   - DOCX/reader → "View as Reader" only (links to /book/[id])
//   - Physical    → PDF download if pdf_url set, otherwise nothing
//   - Always:     → "View as Reader" link is shown only when text_url exists

import {
  Loader2, AlertCircle, CheckCircle2, Clock, Download, ExternalLink,
  BookOpen, FileText, Image as ImageIcon, Package, Tag, User,
  Building2, ChevronLeft, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { trpc } from "@/app/_providers/trpc-provider";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ViewBookPage from "@/components/books/book-viewer";

// ─── Helpers (module level) ───────────────────────────────────────────────────

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `₦${Math.ceil(n).toLocaleString()}`;
}

function StatusBadge({ published, status }: { published: boolean; status: string }) {
  if (published) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 border border-emerald-400 text-emerald-800 text-[10px] font-black uppercase tracking-widest">
        <CheckCircle2 size={10} /> Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 border border-amber-400 text-amber-800 text-[10px] font-black uppercase tracking-widest">
      <Clock size={10} /> {status ?? "Draft"} — Pending Approval
    </span>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b-2 border-black pb-3 mb-5">
      <Icon size={16} />
      <h3 className="font-black uppercase italic text-sm tracking-widest">{title}</h3>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-black/10 last:border-0">
      <span className="text-[10px] font-black uppercase tracking-wider opacity-50 w-40 shrink-0">{label}</span>
      <span className="text-sm font-bold text-right">{value ?? "—"}</span>
    </div>
  );
}

function CoverImage({ src, label }: { src?: string | null; label: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black uppercase tracking-widest opacity-40">{label}</p>
      <div className="relative w-full aspect-[3/4] border-2 border-black bg-gray-50 overflow-hidden">
        {src ? (
          <>
            <Image src={src} alt={label} fill className="object-cover" />
            <a
              href={src} download target="_blank" rel="noopener noreferrer"
              className="absolute bottom-2 right-2 bg-black text-white p-1.5 hover:bg-accent hover:text-black transition-colors"
              title="Download"
            >
              <Download size={12} />
            </a>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-20">
            <ImageIcon size={32} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Content Links card ───────────────────────────────────────────────────────
// Rules:
//   has pdf_url  → show "Download PDF" button only (ebook or physical with PDF)
//   has text_url → show "View as Reader" button only (web reader / DOCX flow)
//   has both     → show both (rare, but handle gracefully)
//   neither      → show a "No content uploaded yet" notice
//
// NEVER show both PDF download AND reader link for the same content type
// because they serve the same book — showing both creates confusion about
// which one to use.

function ContentLinksCard({ book }: { book: any }) {
  const hasPdf    = !!book.pdf_url;
  const hasReader = !!book.text_url;
  const isPhysical = book.paper_back || book.hard_cover;
  const isEbook    = book.e_copy;

  // For physical-only books with no digital file at all
  const hasNoContent = !hasPdf && !hasReader;

  return (
    <div className="bg-white border-4 border-black gumroad-shadow p-6 space-y-3">
      <SectionHeader icon={ExternalLink} title="Content Access" />

      {/* PDF download — shown when pdf_url exists */}
      {hasPdf && (
        <a
          href={book.pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between w-full px-4 py-3 border-2 border-black font-black uppercase italic text-xs hover:bg-accent transition-colors"
        >
          <span className="flex items-center gap-2">
            <FileText size={14} />
            {isEbook ? "Download E-Book PDF" : "Download PDF (Physical companion)"}
          </span>
          <Download size={14} />
        </a>
      )}

      {/* Web reader — shown ONLY when text_url exists (DOCX/reader content) */}
      {/* NOT shown when only pdf_url exists — the PDF download already handles it */}
      {hasReader && !hasPdf && (
        <Link
          href={`/book/${book.id}`}
          target="_blank"
          className="flex items-center justify-between w-full px-4 py-3 border-2 border-black font-black uppercase italic text-xs hover:bg-accent transition-colors"
        >
          <span className="flex items-center gap-2">
            <BookOpen size={14} /> View as Reader
          </span>
          <ExternalLink size={14} />
        </Link>
      )}

      {/* Edge case: has both pdf_url AND text_url — show both clearly labelled */}
      {hasReader && hasPdf && (
        <Link
          href={`/book/${book.id}`}
          target="_blank"
          className="flex items-center justify-between w-full px-4 py-3 border-2 border-black/30 font-black uppercase italic text-xs hover:bg-accent transition-colors"
        >
          <span className="flex items-center gap-2">
            <BookOpen size={14} /> Web Reader (DOCX)
          </span>
          <ExternalLink size={14} />
        </Link>
      )}

      {/* Physical book with no digital content */}
      {isPhysical && hasNoContent && (
        <div className="px-4 py-3 border-2 border-dashed border-black/20 text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
          <Package size={14} /> Physical book — no digital file uploaded
        </div>
      )}

      {/* Ebook with no content at all */}
      {isEbook && hasNoContent && (
        <div className="px-4 py-3 border-2 border-dashed border-amber-300 bg-amber-50 text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
          <AlertCircle size={14} /> E-book selected but no file uploaded yet
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id     = params?.id as string;
  const { data: session } = useSession();
  const { toast } = useToast();
  const utils   = trpc.useUtils();

  const userRoles    = (session as any)?.roles || [];
  const isSuperAdmin = userRoles.some((r: any) => r.name === "super-admin");
  const isStaff      = isSuperAdmin || userRoles.some((r: any) =>
    ["publisher", "author"].includes(r.name)
  );

  const { data: book, isLoading, isError } = trpc.getBookById.useQuery(
    { id },
    { enabled: !!id }
  );

  const { mutate: approveBook, isPending: isApproving } =
    trpc.approveBook.useMutation({
      onSuccess: () => {
        toast({ title: "Approved", description: "Book is now live." });
        utils.getBookById.invalidate({ id });
        utils.getAllBooks.invalidate();
      },
      onError: (err) =>
        toast({ variant: "destructive", title: "Error", description: err.message }),
    });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F6]">
        <Loader2 className="animate-spin mb-4 opacity-30" size={48} />
        <p className="font-black uppercase italic text-xs tracking-widest animate-pulse">
          Loading book details…
        </p>
      </div>
    );
  }

  if (isError || !book) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F6] p-6 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 border-[1.5px] border-red-200">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-2xl font-black uppercase italic mb-2">Not Found</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          We couldn't retrieve this book. It may have been deleted.
        </p>
      </div>
    );
  }

  // Non-staff (customers/readers) see the reader directly
  if (!isStaff) {
    return <ViewBookPage book={book as any} />;
  }

  const physicalVariants = (book.variants ?? []).filter(
    (v: any) => v.format === "paperback" || v.format === "hardcover"
  );
  const ebookVariant = (book.variants ?? []).find((v: any) => v.format === "ebook");

  return (
    <div className="space-y-10 pb-20">

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-black pb-8">
        <div className="space-y-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
          >
            <ChevronLeft size={12} /> Back to Books
          </button>
          <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">
            {book.title}<span className="text-accent">.</span>
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge published={book.published} status={book.status ?? "draft"} />
            {book.categories?.map((c: any) => (
              <span
                key={c.id}
                className="px-2 py-0.5 bg-black text-white text-[9px] font-black uppercase tracking-widest"
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>

        {/* Approve button */}
        {isSuperAdmin && !book.published && (
          <Button
            onClick={() => approveBook({ id: book.id })}
            disabled={isApproving}
            className="h-14 px-10 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase italic tracking-widest rounded-none border-2 border-black gumroad-shadow hover:translate-x-[2px] transition-all text-sm shrink-0"
          >
            {isApproving ? <Loader2 size={16} className="animate-spin mr-2" /> : <CheckCircle2 size={16} className="mr-2" />}
            Approve &amp; Publish
          </Button>
        )}

        {book.published && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border-2 border-emerald-400">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span className="text-xs font-black uppercase text-emerald-700">
              Live since {book.published_at
                ? new Date(book.published_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
                : "—"}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left col: covers + content links ─────────────────────── */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border-4 border-black gumroad-shadow p-6">
            <SectionHeader icon={ImageIcon} title="Cover Images" />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <CoverImage src={book.book_cover} label="Front Cover *" />
              </div>
              {(book.paper_back || book.hard_cover) && (
                <>
                  <CoverImage src={book.book_cover2} label="Back Cover" />
                  <CoverImage src={book.book_cover3} label="Spine" />
                  <div className="col-span-2">
                    <CoverImage src={book.book_cover4} label="Full Spread" />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Content access card (rules-based) ─────────────────── */}
          <ContentLinksCard book={book} />
        </div>

        {/* ── Right col: specs ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          <div className="bg-white border-4 border-black gumroad-shadow p-6">
            <SectionHeader icon={FileText} title="Book Information" />
            <SpecRow label="Title"       value={book.title} />
            <SpecRow label="Subtitle"    value={book.subtitle} />
            <SpecRow label="Description" value={
              <span className="text-xs font-medium opacity-70 max-w-sm text-right leading-relaxed">
                {book.long_description || book.short_description || "—"}
              </span>
            } />
            <SpecRow label="Language"   value={book.default_language?.toUpperCase()} />
            <SpecRow label="Page Count" value={book.page_count ? `${book.page_count} pages` : "—"} />
            <SpecRow label="Status"     value={book.status} />
            <SpecRow label="Published"  value={book.published ? "Yes" : "No"} />
            <SpecRow label="Created"    value={new Date(book.created_at).toLocaleDateString("en-NG", {
              day: "numeric", month: "long", year: "numeric",
            })} />
          </div>

          <div className="bg-white border-4 border-black gumroad-shadow p-6">
            <SectionHeader icon={User} title="Author &amp; Publisher" />
            <SpecRow
              label="Author"
              value={book.author
                ? `${(book.author as any).user?.first_name ?? ""} ${(book.author as any).user?.last_name ?? ""}`.trim()
                : "—"}
            />
            <SpecRow label="Author Email" value={(book.author as any)?.user?.email ?? "—"} />
            <SpecRow label="Publisher"    value={(book.publisher as any)?.name ?? "—"} />
          </div>

          {physicalVariants.length > 0 && (
            <div className="bg-white border-4 border-black gumroad-shadow p-6">
              <SectionHeader icon={Package} title="Physical Variants &amp; Pricing" />
              {physicalVariants.map((v: any) => (
                <div key={v.id} className="mb-6 last:mb-0 pb-6 last:pb-0 border-b-2 border-dashed border-black/20 last:border-0">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-3 bg-black text-white inline-block px-2 py-0.5">
                    {v.format} — {v.size ?? "—"}
                  </p>
                  <SpecRow label="Sell Price"  value={fmt(v.list_price)} />
                  <SpecRow label="Size"        value={v.size ?? "—"} />
                  <SpecRow label="Weight"      value={v.weight_grams ? `${v.weight_grams}g` : "—"} />
                  <SpecRow label="Stock"       value={v.stock_quantity ?? 0} />
                  <SpecRow label="ISBN"        value={v.isbn13 ?? "Not assigned"} />
                  <SpecRow label="Status"      value={v.status} />
                </div>
              ))}
            </div>
          )}

          {ebookVariant && (
            <div className="bg-white border-4 border-black gumroad-shadow p-6">
              <SectionHeader icon={Layers} title="E-Book Variant" />
              <SpecRow label="Sell Price" value={fmt(ebookVariant.list_price)} />
              <SpecRow label="ISBN"       value={ebookVariant.isbn13 ?? "Not assigned"} />
              <SpecRow label="Status"     value={ebookVariant.status} />
            </div>
          )}

          <div className="bg-white border-4 border-black gumroad-shadow p-6">
            <SectionHeader icon={Tag} title="Categories &amp; Tags" />
            <SpecRow
              label="Categories"
              value={book.categories?.length ? book.categories.map((c: any) => c.name).join(", ") : "None"}
            />
            <SpecRow
              label="Tags"
              value={book.tags?.length ? book.tags.join(", ") : "None"}
            />
          </div>

          {/* Approval action at bottom for long pages */}
          {isSuperAdmin && !book.published && (
            <div className="bg-emerald-50 border-4 border-emerald-400 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <p className="font-black uppercase italic text-sm">Ready to go live?</p>
                <p className="text-xs opacity-60 mt-1">
                  Approving will publish the book and notify the author by email.
                </p>
              </div>
              <Button
                onClick={() => approveBook({ id: book.id })}
                disabled={isApproving}
                className="h-14 px-10 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase italic tracking-widest rounded-none border-2 border-black gumroad-shadow text-sm shrink-0"
              >
                {isApproving ? <Loader2 size={16} className="animate-spin mr-2" /> : <CheckCircle2 size={16} className="mr-2" />}
                Approve &amp; Publish
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}