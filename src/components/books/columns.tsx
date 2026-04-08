"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Truck, Download, Package, MapPin, Clock, CheckCircle2,
  BookOpen, MoreHorizontal, Trash2, Edit3, Star, Eye,
  LayoutDashboard, ExternalLink,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";
import Link from "next/link";
import BookForm from "./book-form";
import { ViewChapters } from "@/components/chapters/view-chapter";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const menuButtonStyle =
  "w-full text-left px-3 py-2.5 text-xs font-black uppercase italic hover:bg-accent cursor-pointer flex items-center gap-2 transition-colors rounded-none outline-none";

// ─── FulfillmentBadge ─────────────────────────────────────────────────────────

function FulfillmentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    unfulfilled: { label: "Processing",  className: "bg-amber-100  text-amber-700  border-amber-300"   },
    in_progress: { label: "In Progress", className: "bg-blue-100   text-blue-700   border-blue-300"    },
    shipped:     { label: "Shipped",     className: "bg-purple-100 text-purple-700 border-purple-300"  },
    delivered:   { label: "Delivered",   className: "bg-emerald-100 text-emerald-700 border-emerald-300" },
    cancelled:   { label: "Cancelled",   className: "bg-red-100    text-red-700    border-red-300"     },
  };
  const cfg = map[status] ?? map.unfulfilled;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[9px] font-black uppercase border px-2 py-0.5", cfg.className)}>
      {cfg.label}
    </span>
  );
}

// ─── DeliveryInfoDialog ───────────────────────────────────────────────────────

function DeliveryInfoDialog({ book, open, onClose }: { book: any; open: boolean; onClose: () => void }) {
  const addr        = book._deliveryAddress;
  const isDelivered = book._fulfillmentStatus === "delivered";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg border-4 border-black rounded-none gumroad-shadow p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b-2 border-black bg-black text-white">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-14 border border-white/30 shrink-0 overflow-hidden">
              <Image src={book.book_cover || "/bookcover.png"} alt="Cover" fill className="object-cover" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black uppercase italic tracking-tighter text-white leading-tight">
                {book.title}
              </DialogTitle>
              <p className="text-[10px] font-bold uppercase opacity-50 mt-0.5">
                {book._format === "hardcover" ? "Hardcover" : "Paperback"}
                {book._variantSize ? ` · ${book._variantSize}` : ""}
                {book._quantity > 1 ? ` · Qty ${book._quantity}` : ""}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 bg-white">
          <div className="flex items-center justify-between border-b-2 border-black pb-4">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Order Status</span>
            <FulfillmentBadge status={book._fulfillmentStatus} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Order Ref</span>
            <span className="font-black text-sm italic">#{book._orderNumber}</span>
          </div>
          {addr ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-accent" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Ship To</span>
              </div>
              <div className="bg-[#FCFAEE] border-2 border-black p-4 space-y-1">
                {addr.full_name    && <p className="font-black uppercase italic text-sm">{addr.full_name}</p>}
                {addr.address      && <p className="text-xs font-bold opacity-70">{addr.address}</p>}
                {(addr.city || addr.state) && (
                  <p className="text-xs font-bold opacity-70">{[addr.city, addr.state].filter(Boolean).join(", ")}</p>
                )}
                {addr.phone && <p className="text-xs font-bold opacity-50">{addr.phone}</p>}
                {addr.email && <p className="text-xs font-bold opacity-50">{addr.email}</p>}
              </div>
            </div>
          ) : (
            <p className="text-xs font-bold opacity-40 italic">Delivery address not recorded.</p>
          )}
          {book._shippingAmount != null && book._shippingAmount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50">
                Shipping Paid
                {book._shippingZone && (
                  <span className="ml-2 bg-black text-accent text-[8px] font-black px-1.5 py-0.5 tracking-widest">
                    {book._shippingZone}
                  </span>
                )}
              </span>
              <span className="font-black italic">₦{book._shippingAmount.toLocaleString()}</span>
            </div>
          )}
          {!isDelivered ? (
            <div className="bg-accent/10 border-2 border-accent p-4 space-y-1">
              <div className="flex items-center gap-2">
                <Truck size={14} className="text-accent" />
                <p className="text-[10px] font-black uppercase tracking-widest">On Its Way</p>
              </div>
              <p className="text-xs font-bold opacity-70 leading-relaxed">
                Your physical copy is being prepared. Delivery typically takes
                <strong> 2–5 business days</strong> depending on your location.
                All updates will be sent to your email and phone number on file.
              </p>
            </div>
          ) : (
            <div className="bg-emerald-50 border-2 border-emerald-500 p-4 flex items-center gap-3">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                Delivered — enjoy your copy!
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── ReaderBookAction ─────────────────────────────────────────────────────────

function ReaderBookAction({ book }: { book: any }) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  if (book._isPhysical) {
    return (
      <>
        <Button
          onClick={() => setDialogOpen(true)}
          className="h-12 px-8 text-xs italic tracking-widest border-4 border-black bg-white text-black hover:bg-accent gumroad-shadow font-black uppercase"
        >
          <Truck size={16} className="mr-2" /> Delivery Info
        </Button>
        <DeliveryInfoDialog book={book} open={dialogOpen} onClose={() => setDialogOpen(false)} />
      </>
    );
  }

  // ── Ebook: link to the public reader route, NOT the admin view page ──────
  // /book/[id] renders ViewBookPage (book-viewer.tsx) for the customer.
  // Previously this incorrectly linked to /app/books/view/[id] (admin panel).
  return (
    <Link href={`/book/${book.id}`}>
      <Button className="booka-button-primary h-12 px-8 text-xs italic tracking-widest">
        <BookOpen size={16} className="mr-2" /> Read Now
      </Button>
    </Link>
  );
}

// ─── StaffBookAction ──────────────────────────────────────────────────────────

function StaffBookAction({ book, meta }: { book: any; meta: any }) {
  const { toast }   = useToast();
  const utils       = trpc.useUtils();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const isSuperAdmin = meta?.isSuperAdmin;
  const isPublisher  = meta?.isPublisher;

  const toggleFeatured = trpc.toggleFeatured.useMutation({
    onSuccess: (_, variables) => {
      toast({
        title: "Visibility Updated",
        description: `Book ${variables.featured ? "added to" : "removed from"} ${variables.scope} featured list.`,
      });
      setIsMenuOpen(false);
      utils.getAllBooks.invalidate();
      utils.getBookByAuthor.invalidate();
    },
    onError: (err) =>
      toast({ variant: "destructive", title: "Action Failed", description: err.message }),
  });

  const approveBook = trpc.approveBook.useMutation({
    onSuccess: () => {
      toast({ title: "Approved", description: `"${book.title}" is now live.` });
      setIsMenuOpen(false);
      utils.getAllBooks.invalidate();
      utils.getBookByAuthor.invalidate();
    },
    onError: (err) =>
      toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const deleteBook = trpc.deleteBook.useMutation({
    onSuccess: () => {
      toast({ title: "Deleted", description: "The book has been permanently removed." });
      utils.getAllBooks.invalidate();
      utils.getBookByAuthor.invalidate();
    },
    onError: (err) =>
      toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 border-2 border-transparent hover:border-black rounded-none">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="rounded-none border-4 border-black gumroad-shadow w-72 p-0 bg-white">
        {/* Context header */}
        <div className="flex items-center gap-3 px-3 py-3 border-b-2 border-black bg-black text-white">
          <div className="relative w-8 h-11 border border-white/30 shrink-0 overflow-hidden">
            <Image src={book.book_cover || "/bookcover.png"} alt="Cover" fill className="object-cover" />
          </div>
          <div className="overflow-hidden">
            <p className="font-black uppercase italic text-xs tracking-tight leading-tight truncate">{book.title}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {book.published ? (
                <span className="flex items-center gap-1 text-emerald-400 text-[9px] font-bold uppercase">
                  <CheckCircle2 size={8} /> Live
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 text-[9px] font-bold uppercase">
                  <Clock size={8} /> Pending Approval
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 1. Full admin detail view */}
        <Link href={`/app/books/view/${book.id}`} className={menuButtonStyle} onClick={() => setIsMenuOpen(false)}>
          <ExternalLink size={14} /> View Full Details
        </Link>

        {/* 2. Reader preview — correct public route */}
        <Link href={`/book/${book.id}`} target="_blank" className={menuButtonStyle} onClick={() => setIsMenuOpen(false)}>
          <Eye size={14} /> Preview as Reader
        </Link>

        {/* 3. Edit */}
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0 focus:bg-transparent">
          <BookForm
            action="Edit"
            book={book}
            trigger={<div className={menuButtonStyle}><Edit3 size={14} /> Edit Book</div>}
          />
        </DropdownMenuItem>

        {/* 4. Manage chapters */}
        {book.e_copy && (
          <ViewChapters
            id={book.id}
            trigger={<div className={menuButtonStyle}><BookOpen size={14} /> Manage Chapters</div>}
          />
        )}

        <DropdownMenuSeparator className="bg-black m-0 h-[2px]" />

        {/* 5. Approve */}
        {isSuperAdmin && !book.published && (
          <DropdownMenuItem
            className={cn(menuButtonStyle, "text-emerald-700 hover:bg-emerald-50")}
            onClick={() => approveBook.mutate({ id: book.id })}
            disabled={approveBook.isPending}
          >
            <CheckCircle2 size={14} />
            {approveBook.isPending ? "Approving…" : "Approve & Publish"}
          </DropdownMenuItem>
        )}

        {/* 6. Global featured */}
        {isSuperAdmin && (
          <DropdownMenuItem
            className={menuButtonStyle}
            onClick={() => toggleFeatured.mutate({ bookId: book.id, featured: !book.featured, scope: "global" })}
          >
            <Star size={14} className={cn(book.featured ? "fill-blue-600 text-blue-600" : "text-black")} />
            {book.featured ? "Unfeature Globally" : "Feature Globally"}
          </DropdownMenuItem>
        )}

        {/* 7. Shop featured */}
        {!isSuperAdmin && isPublisher && (
          <DropdownMenuItem
            className={menuButtonStyle}
            onClick={() => toggleFeatured.mutate({ bookId: book.id, featured: !book.featured_shop, scope: "shop" })}
          >
            <LayoutDashboard size={14} className={cn(book.featured_shop ? "fill-accent text-accent" : "text-black")} />
            {book.featured_shop ? "Remove from Shop" : "Feature in My Shop"}
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-black m-0 h-[2px]" />

        {/* 8. Delete */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <div className={cn(menuButtonStyle, "text-red-600 focus:bg-red-50 focus:text-red-600")}>
              <Trash2 size={14} /> Delete
            </div>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-none border-4 border-black bg-white gumroad-shadow-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black uppercase italic text-2xl tracking-tighter">
                Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription className="font-bold text-black/60">
                This will permanently delete{" "}
                <span className="text-black underline">"{book.title}"</span> and remove all associated chapters and variants.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-4">
              <AlertDialogCancel className="rounded-none border-2 border-black font-black uppercase italic text-xs hover:bg-accent transition-colors">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteBook.mutate({ id: book.id })}
                className="rounded-none border-2 border-black bg-red-600 text-white font-black uppercase italic text-xs hover:bg-red-700 transition-colors"
              >
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────

export const staffBookColumns: ColumnDef<any>[] = [
  {
    accessorKey: "title",
    header: "Book Details",
    cell: ({ row }) => (
      <div className="flex items-center gap-4 py-2">
        <div className="relative w-12 h-16 border-2 border-black bg-white shrink-0 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
          <Image src={row.original.book_cover || "/bookcover.png"} alt="Cover" fill className="object-cover" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-black uppercase italic text-sm tracking-tighter leading-none">{row.original.title}</span>
          <span className="text-[10px] font-bold opacity-40 uppercase">
            By {row.original.author?.name || row.original.author?.user?.first_name || "Independent"}
          </span>
          {row.original.published ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600">
              <CheckCircle2 size={9} /> Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-600">
              <Clock size={9} /> Pending Approval
            </span>
          )}
        </div>
      </div>
    ),
  },
  {
    // Author column — used as the filter target for the author dropdown
    id:          "author_name",
    accessorFn:  (row) => row.author?.name || row.author?.user?.first_name || "",
    header:      "Author",
    cell: ({ row }) => (
      <span className="text-xs font-bold opacity-60">
        {row.original.author?.name
          || `${row.original.author?.user?.first_name ?? ""} ${row.original.author?.user?.last_name ?? ""}`.trim()
          || "—"}
      </span>
    ),
  },
  {
    accessorKey: "salesCount",
    header: "Sales",
    cell: ({ row }) => {
      const book  = row.original;
      const count: number =
        typeof book.salesCount === "number"
          ? book.salesCount
          : (book.variants ?? []).reduce(
              (acc: number, v: any) => acc + (v._count?.order_lineitems || 0),
              0
            );
      return <span className="font-black italic underline text-sm">{count}</span>;
    },
  },
  {
    accessorKey: "price",
    header: "Base Price",
    cell: ({ row }) => (
      <span className="font-bold opacity-60 text-xs tracking-widest">
        ₦{(row.original.price || 0).toLocaleString()}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row, table }) => <StaffBookAction book={row.original} meta={table.options.meta} />,
  },
];

export const readerBookColumns: ColumnDef<any>[] = [
  {
    accessorKey: "title",
    header: "My Bookshelf",
    cell: ({ row }) => {
      const book       = row.original;
      const isPhysical = book._isPhysical;
      return (
        <div className="flex items-center gap-4 py-3">
          <div className="relative w-14 h-20 border-2 border-black bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)] shrink-0">
            <Image src={book.book_cover || "/bookcover.png"} alt="Cover" fill className="object-cover" />
          </div>
          <div className="space-y-1.5">
            <p className="font-black uppercase italic text-base tracking-tighter leading-none">{book.title}</p>
            <div className="flex items-center gap-1.5">
              {isPhysical
                ? <Truck size={10} className="text-accent" />
                : <Download size={10} className="text-accent" />
              }
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50">
                {book._format === "hardcover"
                  ? "Hardcover"
                  : book._format === "paperback"
                  ? "Paperback"
                  : "E-Book"
                }
                {book._variantSize ? ` · ${book._variantSize}` : ""}
                {/* Show qty if > 1 (e.g. "Qty 2") */}
                {book._quantity > 1 ? ` · Qty ${book._quantity}` : ""}
              </span>
            </div>
            {isPhysical && <FulfillmentBadge status={book._fulfillmentStatus} />}
          </div>
        </div>
      );
    },
  },
  {
    id:   "action",
    cell: ({ row }) => <ReaderBookAction book={row.original} />,
  },
];