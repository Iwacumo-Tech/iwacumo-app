import {
  downloadBook,
  getDownloadedBookCount,
  type DownloadProgress,
} from "./offline-manager";

export const MAX_OFFLINE_BOOKS = 10;
const AUTO_DOWNLOAD_FLAG = "iwacumo_auto_download_done";

export interface AutoDownloadResult {
  succeeded: Array<{ id: string; title: string }>;
  failed: Array<{ id: string; title: string; error: string }>;
  skippedNoChapters: number;
}

export interface AutoDownloadCallbacks {
  onBookStart?: (book: { id: string; title: string }, index: number, total: number) => void;
  onBookProgress?: (progress: DownloadProgress) => void;
}

function isPreorderActive(entry: any): boolean {
  return !!(
    entry.preorder_enabled &&
    entry.publication_date &&
    new Date(entry.publication_date) > new Date()
  );
}

// Most recently purchased ebooks first, up to the remaining offline cap.
// Skips physical books (nothing readable to cache), already-downloaded
// books, and unreleased preorders (chapter fetch is server-rejected).
export function selectBooksForAutoDownload(
  purchasedEntries: any[],
  downloadedIds: Set<string>,
  limit: number
): any[] {
  const seen = new Set<string>();
  const selected: any[] = [];
  const sorted = [...(purchasedEntries || [])].sort(
    (a, b) => +new Date(b._orderedAt) - +new Date(a._orderedAt)
  );

  for (const entry of sorted) {
    if (selected.length >= limit) break;
    if (!entry?.id) continue;
    if (entry._isPhysical) continue;
    if (seen.has(entry.id) || downloadedIds.has(entry.id)) continue;
    if (isPreorderActive(entry)) continue;
    seen.add(entry.id);
    selected.push(entry);
  }

  return selected;
}

export function hasAutoDownloadRun(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(AUTO_DOWNLOAD_FLAG) === "1";
  } catch {
    return true;
  }
}

export function markAutoDownloadDone(): void {
  try {
    window.localStorage.setItem(AUTO_DOWNLOAD_FLAG, "1");
  } catch {
    // Storage unavailable — run will simply retry next launch
  }
}

type TrpcUtils = {
  getBookById: { fetch: (input: { id: string }) => Promise<any> };
  getAllChapterByBookId: { fetch: (input: { book_id: string }) => Promise<any[]> };
  getChapterContent: {
    fetch: (input: { bookId: string; chapterId: string }) => Promise<any>;
  };
};

export async function runAutoDownload(
  trpc: TrpcUtils,
  candidates: any[],
  callbacks: AutoDownloadCallbacks = {}
): Promise<AutoDownloadResult> {
  const result: AutoDownloadResult = { succeeded: [], failed: [], skippedNoChapters: 0 };

  for (let i = 0; i < candidates.length; i++) {
    const entry = candidates[i];
    callbacks.onBookStart?.(
      { id: entry.id, title: entry.title ?? "Book" },
      i,
      candidates.length
    );

    try {
      const chapters = await trpc.getAllChapterByBookId.fetch({ book_id: entry.id });
      if (!chapters || chapters.length === 0) {
        result.skippedNoChapters += 1;
        continue;
      }

      await downloadBook(
        entry.id,
        () => trpc.getBookById.fetch({ id: entry.id }),
        async () => chapters,
        (bid, cid) => trpc.getChapterContent.fetch({ bookId: bid, chapterId: cid }),
        (progress) => callbacks.onBookProgress?.(progress)
      );

      result.succeeded.push({ id: entry.id, title: entry.title ?? "Book" });
    } catch (error) {
      result.failed.push({
        id: entry.id,
        title: entry.title ?? "Book",
        error: error instanceof Error ? error.message : "Download failed",
      });
    }
  }

  return result;
}

export async function getRemainingOfflineSlots(): Promise<number> {
  const used = await getDownloadedBookCount();
  return Math.max(0, MAX_OFFLINE_BOOKS - used);
}
