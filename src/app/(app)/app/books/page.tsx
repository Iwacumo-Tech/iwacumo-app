"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import BookForm from "@/components/books/book-form";
import { Button } from "@/components/ui/button";
import { staffBookColumns, readerBookColumns } from "@/components/books/columns";
import { DataTable } from "@/components/table/data-table";
import { useSession } from "next-auth/react";
import { Plus, Users, X, ChevronDown, Loader2, RefreshCcw, Download, Cloud, CheckCircle2, WifiOff } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getDownloadedBookCount, getDownloadedBooks, downloadBook } from "@/lib/offline-manager";
import StorageLimitModal from "@/components/shared/StorageLimitModal";

export default function BooksPage() {
  const { data: session } = useSession();
  const userId    = session?.user.id as string;
  const userRoles = session?.roles || [];
  const activeProfile = session?.activeProfile;

  // ── Role flags ────────────────────────────────────────────────
  const isSuperAdmin = userRoles.some(r => r.name === "super-admin");
  const isPublisher  = activeProfile === "publisher";
  const isAuthor     = activeProfile === "author";
  const isCustomer   = activeProfile === "reader";
  const isStaff      = activeProfile === "staff" || isPublisher || isAuthor;

  // ── Author filter state (publisher + super-admin only) ────────
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const canFilterByAuthor = isSuperAdmin || isPublisher;

  // ── Offline storage state ─────────────────────────────────────
  const [downloadedBookCount, setDownloadedBookCount] = useState(0);
  const [showStorageLimitModal, setShowStorageLimitModal] = useState(false);
  const [downloadingBookId, setDownloadingBookId] = useState<string | null>(null);

  useEffect(() => {
    const loadDownloadCount = async () => {
      const count = await getDownloadedBookCount();
      setDownloadedBookCount(count);
    };
    loadDownloadCount();
  }, []);

  const handleDownloadAll = async () => {
    if (downloadedBookCount >= 10) {
      setShowStorageLimitModal(true);
      return;
    }

    const booksToDownload = (effectivePurchasedBooks ?? []).slice(0, 10 - downloadedBookCount);
    
    for (const book of booksToDownload) {
      try {
        setDownloadingBookId(book.id);
        
        // Use the already-loaded book data from purchasedBooks
        await downloadBook(
          book.id,
          async () => book,
          async () => book.chapters || [],
          async (bid, cid) => {
            // Fetch each chapter content via fetch API
            const chapterResult = await fetch(`/api/trpc/getChapterContent?input=${encodeURIComponent(JSON.stringify({ bookId: bid, chapterId: cid }))}`);
            const data = await chapterResult.json();
            return data.result?.data?.json || { content: '', title: '', chapter_number: 0, section_type: 'chapter' };
          }
        );
      } catch (error: any) {
        console.error(`Failed to download ${book.title}:`, error);
        if (error.message?.includes('Storage limit')) {
          setShowStorageLimitModal(true);
          break;
        }
      }
    }
    
    setDownloadingBookId(null);
    const newCount = await getDownloadedBookCount();
    setDownloadedBookCount(newCount);
  };

  // ── Offline state ─────────────────────────────────────────────
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [cachedLibraryData, setCachedLibraryData] = useState<any[] | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load cached library data on mount
    const loadCachedData = async () => {
      if (isCustomer && !isStaff && userId) {
        const { getCachedLibraryData } = await import('@/lib/offline-manager');
        const cached = await getCachedLibraryData(userId);
        setCachedLibraryData(cached);
      }
    };
    loadCachedData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isCustomer, isStaff, userId]);

  // ── Data fetching ─────────────────────────────────────────────
  const { data: allBooks } = trpc.getAllBooks.useQuery(
    undefined,
    { enabled: activeProfile === "staff" && isSuperAdmin && !isOffline }
  );

  const { data: authorBooks } = trpc.getBookByAuthor.useQuery(
    { id: userId },
    { enabled: (isAuthor || isPublisher) && !isOffline }
  );

  const {
    data: purchasedBooks,
    isLoading: purchasedBooksLoading,
    isFetching: purchasedBooksFetching,
    refetch: refetchPurchasedBooks,
  } = trpc.getPurchasedBooksByCustomer.useQuery(
    { id: userId },
    {
      enabled: !!isCustomer && !isStaff && !isOffline,
      refetchOnMount: "always",
    }
  );

  // Cache library data when successfully fetched
  useEffect(() => {
    if (purchasedBooks && userId && !isOffline) {
      import('@/lib/offline-manager').then(({ cacheLibraryData }) => {
        cacheLibraryData(userId, purchasedBooks);
      });
    }
  }, [purchasedBooks, userId, isOffline]);

  // Use cached data when offline
  const effectivePurchasedBooks = isOffline && !purchasedBooks ? cachedLibraryData : purchasedBooks;

  // Fetch authors for the filter dropdown (publisher/admin only)
  const { data: authorsForFilter } = trpc.getAuthorsByUser.useQuery(
    { id: userId },
    { enabled: canFilterByAuthor && !!userId }
  );

  // ── Resolve base display data ─────────────────────────────────
  const baseData = activeProfile === "staff" && isSuperAdmin
    ? (allBooks    ?? [])
    : (isAuthor || isPublisher)
    ? (authorBooks ?? [])
    : (effectivePurchasedBooks ?? []);

  // ── Apply author filter ───────────────────────────────────────
  // Filters by book.author_id when a specific author is selected.
  const displayData = useMemo(() => {
    if (!selectedAuthorId || !canFilterByAuthor) return baseData;
    return baseData.filter((b: any) => b.author_id === selectedAuthorId);
  }, [baseData, selectedAuthorId, canFilterByAuthor]);

  // ── Build author label list for the dropdown ──────────────────
  const authorOptions = useMemo(() => {
    if (!authorsForFilter) return [];
    return authorsForFilter.map((a: any) => ({
      id:   a.id,
      name: a.name
        || `${a.user?.first_name ?? ""} ${a.user?.last_name ?? ""}`.trim()
        || a.user?.email
        || "Unknown Author",
    }));
  }, [authorsForFilter]);

  const selectedAuthorName = selectedAuthorId
    ? authorOptions.find(a => a.id === selectedAuthorId)?.name ?? "Unknown"
    : null;

  // ── Column selection ──────────────────────────────────────────
  const columns = isStaff ? staffBookColumns : readerBookColumns;
  const isReaderLibrary = isCustomer && !isStaff;
  const isLibraryLoading = isReaderLibrary && purchasedBooksLoading && !isOffline;
  const isLibraryRefreshing = isReaderLibrary && purchasedBooksFetching && !purchasedBooksLoading && !isOffline;
  const isOfflineWithNoData = isOffline && !effectivePurchasedBooks;

  // ── Staff total value ─────────────────────────────────────────
  const staffTotalValue = isStaff
    ? displayData.reduce((acc: number, b: any) => {
        const variants: any[] = b.variants ?? [];
        if (variants.length === 0) return acc + (b.price || 0);
        const lowestVariantPrice = Math.min(
          ...variants
            .filter((v: any) => v.status === "active" && v.list_price > 0)
            .map((v: any) => v.list_price)
        );
        return acc + (isFinite(lowestVariantPrice) ? lowestVariantPrice : b.price || 0);
      }, 0)
    : 0;

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-4 border-black pb-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            {isCustomer && !isStaff ? "My Library" : "Books"}
            <span className="text-accent">.</span>
          </h1>
          <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2">
            {displayData.length} {selectedAuthorId ? `books by ${selectedAuthorName}` : "titles"}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {isReaderLibrary && (
            <Button
              type="button"
              variant="outline"
              onClick={() => refetchPurchasedBooks()}
              disabled={purchasedBooksFetching}
              className="h-12 px-5 border-[1.5px] rounded-none border-black bg-white text-black font-black uppercase italic text-xs tracking-widest"
            >
              {purchasedBooksFetching ? (
                <Loader2 size={14} className="mr-2 animate-spin" />
              ) : (
                <RefreshCcw size={14} className="mr-2" />
              )}
              Refresh Library
            </Button>
          )}
          {isReaderLibrary && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadAll}
                disabled={!!downloadingBookId}
                className="h-12 px-5 border-[1.5px] rounded-none border-black bg-white text-black font-black uppercase italic text-xs tracking-widest"
              >
                {downloadingBookId ? (
                  <Loader2 size={14} className="mr-2 animate-spin" />
                ) : (
                  <Download size={14} className="mr-2" />
                )}
                Download All
              </Button>
              <div className="flex items-center gap-1 text-xs font-bold">
                <Cloud size={14} className="text-muted-foreground" />
                <span>{downloadedBookCount}/10</span>
              </div>
            </div>
          )}
          {/* ── Author filter dropdown (publisher + super-admin) ── */}
          {canFilterByAuthor && authorOptions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={`h-12 px-5 border-[1.5px] rounded-none font-black uppercase italic text-xs tracking-widest flex items-center gap-2 transition-colors ${
                    selectedAuthorId
                      ? "border-black bg-accent text-black"
                      : "border-black bg-white text-black hover:bg-black/[0.04]"
                  }`}
                >
                  <Users size={14} />
                  {selectedAuthorId ? selectedAuthorName : "All Authors"}
                  <ChevronDown size={12} className="opacity-50" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="rounded-none border-[1.5px] border-black bg-white w-56 p-0 max-h-80 overflow-y-auto"
              >
                <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest opacity-40 px-3 py-2 border-b border-black/10">
                  Filter by Author
                </DropdownMenuLabel>

                {/* All authors option */}
                <DropdownMenuItem
                  className={`px-3 py-2.5 text-xs font-black uppercase italic cursor-pointer transition-colors rounded-none ${
                    !selectedAuthorId ? "bg-accent" : "hover:bg-accent/40"
                  }`}
                  onClick={() => setSelectedAuthorId(null)}
                >
                  <span className="flex items-center gap-2">
                    {!selectedAuthorId && <span className="w-1.5 h-1.5 bg-black rounded-full" />}
                    All Authors
                    <span className="ml-auto text-[9px] opacity-40 font-bold not-italic">
                      {baseData.length}
                    </span>
                  </span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-black/10 m-0" />

                {/* Individual author options */}
                {authorOptions.map(author => {
                  const count = baseData.filter((b: any) => b.author_id === author.id).length;
                  return (
                    <DropdownMenuItem
                      key={author.id}
                      className={`px-3 py-2.5 text-xs font-black uppercase italic cursor-pointer transition-colors rounded-none ${
                        selectedAuthorId === author.id ? "bg-accent" : "hover:bg-accent/40"
                      }`}
                      onClick={() => setSelectedAuthorId(author.id)}
                    >
                      <span className="flex items-center gap-2 w-full">
                        {selectedAuthorId === author.id && (
                          <span className="w-1.5 h-1.5 bg-black rounded-full shrink-0" />
                        )}
                        <span className="truncate">{author.name}</span>
                        <span className="ml-auto text-[9px] opacity-40 font-bold not-italic shrink-0">
                          {count}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Clear filter badge */}
          {selectedAuthorId && (
            <button
              onClick={() => setSelectedAuthorId(null)}
              className="flex items-center gap-1.5 h-12 px-3 border-[1.5px] border-black/30 text-[10px] font-black uppercase tracking-widest hover:border-black hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Clear author filter"
            >
              <X size={12} /> Clear
            </button>
          )}

          {/* Add book button */}
          {isStaff && (
            <BookForm
              book={{} as any}
              action="Add"
              trigger={
                <Button className="booka-button-primary h-12 px-8 text-sm">
                  <Plus size={18} className="mr-2 stroke-[3px]" /> New Book
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      {isReaderLibrary && (
        <div className="border-2 border-black bg-[#f9f6f0] px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {isLibraryLoading || isLibraryRefreshing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isOffline ? (
              <WifiOff size={16} className="text-amber-600" />
            ) : (
              <div className="h-2.5 w-2.5 bg-accent border border-black shrink-0" />
            )}
            <p className="text-[10px] font-black uppercase tracking-widest text-black/60">
              {isOffline
                ? isOfflineWithNoData
                  ? "You're offline. No cached library data available."
                  : "You're offline. Showing cached library data."
                : isLibraryLoading
                ? "Loading your purchased books..."
                : isLibraryRefreshing
                ? "Refreshing your library..."
                : "Your purchased books are shown here after payment is confirmed."}
            </p>
          </div>

          {!isLibraryLoading && !isOffline && displayData.length === 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => refetchPurchasedBooks()}
              disabled={purchasedBooksFetching}
              className="h-10 px-4 rounded-none border-[1.5px] border-black bg-white text-[10px] font-black uppercase tracking-widest"
            >
              {purchasedBooksFetching ? (
                <Loader2 size={14} className="mr-2 animate-spin" />
              ) : (
                <RefreshCcw size={14} className="mr-2" />
              )}
              Check Again
            </Button>
          )}
        </div>
      )}

      {isLibraryLoading ? (
        <div className="bg-white border-4 border-black gumroad-shadow p-10 sm:p-14">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <Loader2 size={28} className="animate-spin" />
            <div>
              <p className="text-sm font-black uppercase tracking-widest">Loading Library</p>
              <p className="mt-2 text-xs font-bold text-black/60">
                Your books should appear here as soon as the purchase records finish loading.
              </p>
            </div>
          </div>
        </div>
      ) : isOfflineWithNoData ? (
        <div className="bg-white border-4 border-black gumroad-shadow p-10 sm:p-14">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <WifiOff size={28} className="text-amber-600" />
            <div>
              <p className="text-sm font-black uppercase tracking-widest">Offline & No Cached Data</p>
              <p className="mt-2 text-xs font-bold text-black/60">
                You're offline and no library data is cached. Connect to the internet to view your books.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border-4 border-black gumroad-shadow overflow-hidden">
          <DataTable
            data={displayData}
            columns={columns}
            filterInputPlaceholder={
              isCustomer && !isStaff
                ? "Search your library by title..."
                : "Search books by title..."
            }
            filterColumnId="title"
            meta={{ isSuperAdmin, isPublisher, isAuthor }}
          />
        </div>
      )}

      {/* ── Footer — staff only ─────────────────────────────── */}
      {isStaff && displayData.length > 0 && (
        <div className="bg-muted border-4 border-t-0 border-black p-4 flex justify-between items-center px-10">
          <span className="font-black uppercase italic text-xs">
            {selectedAuthorId ? `${selectedAuthorName}'s Catalog Value` : "Total Catalog Value"}
            <span className="ml-2 font-normal normal-case opacity-40 text-[10px]">
              (lowest active variant price per book)
            </span>
          </span>
          <span className="font-black text-xl italic tracking-tight">
            ₦{staffTotalValue.toLocaleString()}
          </span>
        </div>
      )}

      {/* ── Storage Limit Modal ─────────────────────────────── */}
      <StorageLimitModal
        open={showStorageLimitModal}
        onClose={() => setShowStorageLimitModal(false)}
        onSpaceFreed={async () => {
          const newCount = await getDownloadedBookCount();
          setDownloadedBookCount(newCount);
        }}
      />
    </div>
  );
}
