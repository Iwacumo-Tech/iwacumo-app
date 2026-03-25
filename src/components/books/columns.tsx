"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Trash2,
  Edit3,
  Star,
  BookOpen,
  Eye,
  LayoutDashboard,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const menuButtonStyle =
  "w-full text-left px-3 py-2.5 text-xs font-black uppercase italic hover:bg-accent cursor-pointer flex items-center gap-2 transition-colors rounded-none outline-none";

// ─────────────────────────────────────────────────────────────────────────────
// Staff action menu
// ─────────────────────────────────────────────────────────────────────────────

function StaffBookAction({ book, meta }: { book: any; meta: any }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
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
        <Button
          variant="ghost"
          className="h-8 w-8 p-0 border-2 border-transparent hover:border-black rounded-none"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="rounded-none border-4 border-black gumroad-shadow w-72 p-0 bg-white"
      >
        {/* ── Context header — makes it clear which book this is ── */}
        <div className="flex items-center gap-3 px-3 py-3 border-b-2 border-black bg-black text-white">
          <div className="relative w-8 h-11 border border-white/30 shrink-0 overflow-hidden">
            <Image
              src={book.book_cover || "/bookcover.png"}
              alt="Cover"
              fill
              className="object-cover"
            />
          </div>
          <div className="overflow-hidden">
            <p className="font-black uppercase italic text-xs tracking-tight leading-tight truncate">
              {book.title}
            </p>
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
        <Link
          href={`/app/books/view/${book.id}`}
          className={menuButtonStyle}
          onClick={() => setIsMenuOpen(false)}
        >
          <ExternalLink size={14} /> View Full Details
        </Link>

        {/* 2. Reader preview */}
        <Link
          href={`/book/${book.id}`}
          target="_blank"
          className={menuButtonStyle}
          onClick={() => setIsMenuOpen(false)}
        >
          <Eye size={14} /> Preview as Reader
        </Link>

        {/* 3. Edit */}
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          className="p-0 focus:bg-transparent"
        >
          <BookForm
            action="Edit"
            book={book}
            trigger={
              <div className={menuButtonStyle}>
                <Edit3 size={14} /> Edit Book
              </div>
            }
          />
        </DropdownMenuItem>

        {/* 4. Manage chapters (e-books only) */}
        {book.e_copy && (
          <ViewChapters
            id={book.id}
            trigger={
              <div className={menuButtonStyle}>
                <BookOpen size={14} /> Manage Chapters
              </div>
            }
          />
        )}

        <DropdownMenuSeparator className="bg-black m-0 h-[2px]" />

        {/* 5. Approve (super admin, pending books only) */}
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

        {/* 6. Global featured (super admin) */}
        {isSuperAdmin && (
          <DropdownMenuItem
            className={menuButtonStyle}
            onClick={() =>
              toggleFeatured.mutate({
                bookId: book.id,
                featured: !book.featured,
                scope: "global",
              })
            }
          >
            <Star
              size={14}
              className={cn(book.featured ? "fill-blue-600 text-blue-600" : "text-black")}
            />
            {book.featured ? "Unfeature Globally" : "Feature Globally"}
          </DropdownMenuItem>
        )}

        {/* 7. Shop featured (publisher only) */}
        {!isSuperAdmin && isPublisher && (
          <DropdownMenuItem
            className={menuButtonStyle}
            onClick={() =>
              toggleFeatured.mutate({
                bookId: book.id,
                featured: !book.featured_shop,
                scope: "shop",
              })
            }
          >
            <LayoutDashboard
              size={14}
              className={cn(
                book.featured_shop ? "fill-accent text-accent" : "text-black"
              )}
            />
            {book.featured_shop ? "Remove from Shop" : "Feature in My Shop"}
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-black m-0 h-[2px]" />

        {/* 8. Delete */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <div
              className={cn(
                menuButtonStyle,
                "text-red-600 focus:bg-red-50 focus:text-red-600"
              )}
            >
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
                <span className="text-black underline">"{book.title}"</span> and
                remove all associated chapters and variants.
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

// ─────────────────────────────────────────────────────────────────────────────
// Column definitions
// ─────────────────────────────────────────────────────────────────────────────

export const staffBookColumns: ColumnDef<any>[] = [
  {
    accessorKey: "title",
    header: "Book Details",
    cell: ({ row }) => (
      <div className="flex items-center gap-4 py-2">
        <div className="relative w-12 h-16 border-2 border-black bg-white shrink-0 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
          <Image
            src={row.original.book_cover || "/bookcover.png"}
            alt="Cover"
            fill
            className="object-cover"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-black uppercase italic text-sm tracking-tighter leading-none">
            {row.original.title}
          </span>
          <span className="text-[10px] font-bold opacity-40 uppercase">
            By {row.original.author?.name || "Independent"}
          </span>
          {/* Publication status inline with the book title */}
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
    accessorKey: "sales",
    header: "Sales",
    cell: ({ row }) => {
      const variants = row.original.variants || [];
      const totalSales = variants.reduce(
        (acc: number, v: any) => acc + (v._count?.order_lineitems || 0),
        0
      );
      return <span className="font-black italic underline text-sm">{totalSales}</span>;
    },
  },
  {
    accessorKey: "revenue",
    header: "Revenue",
    cell: ({ row }) => {
      const variants = row.original.variants || [];
      const totalRevenue = variants.reduce((acc: number, v: any) => {
        const variantTotal =
          v.order_lineitems?.reduce(
            (sum: number, item: any) => sum + (item.total_price || 0),
            0
          ) || 0;
        return acc + variantTotal;
      }, 0);
      return (
        <span className="font-black text-sm">₦{totalRevenue.toLocaleString()}</span>
      );
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
    cell: ({ row, table }) => (
      <StaffBookAction book={row.original} meta={table.options.meta} />
    ),
  },
];

export const readerBookColumns: ColumnDef<any>[] = [
  {
    accessorKey: "title",
    header: "My Bookshelf",
    cell: ({ row }) => (
      <div className="flex items-center gap-4 py-3">
        <div className="relative w-14 h-20 border-2 border-black bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          <Image
            src={row.original.book_cover || "/bookcover.png"}
            alt="Cover"
            fill
            className="object-cover"
          />
        </div>
        <div>
          <p className="font-black uppercase italic text-base tracking-tighter leading-none">
            {row.original.title}
          </p>
          <p className="text-[10px] font-bold opacity-40 uppercase mt-2">
            Personal Library
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "action",
    cell: ({ row }) => (
      <Link href={`/app/books/view/${row.original.id}`}>
        <Button className="booka-button-primary h-12 px-8 text-xs italic tracking-widest">
          <BookOpen size={16} className="mr-2" /> Open Library
        </Button>
      </Link>
    ),
  },
];