import { getDB, getChapterKey, getProgressKey } from './offline-db';
import { encryptContent, decryptContent } from './offline-encryption';

const MAX_OFFLINE_BOOKS = 10;

export interface DownloadProgress {
  bookId: string;
  progress: number;
  totalChapters: number;
  downloadedChapters: number;
}

export interface SyncQueueItem {
  id: string;
  type: 'progress' | 'bookmark';
  payload: any;
  created_at: string;
  attempts: number;
}

// Check if book is downloaded
export async function isBookDownloaded(bookId: string): Promise<boolean> {
  const db = await getDB();
  const book = await db.get('books', bookId);
  return !!book;
}

// Get download progress for a book
export async function getDownloadProgress(bookId: string): Promise<DownloadProgress | null> {
  const db = await getDB();
  const book = await db.get('books', bookId);
  if (!book) return null;
  
  return {
    bookId: book.id,
    progress: book.download_progress,
    totalChapters: book.total_chapters,
    downloadedChapters: book.downloaded_chapters,
  };
}

// Get count of downloaded books
export async function getDownloadedBookCount(): Promise<number> {
  const db = await getDB();
  const keys = await db.getAllKeys('books');
  return keys.length;
}

// Get all downloaded books
export async function getDownloadedBooks() {
  const db = await getDB();
  return await db.getAll('books');
}

// Download a book for offline reading
export async function downloadBook(
  bookId: string,
  fetchBook: (id: string) => Promise<any>,
  fetchChapters: (bookId: string) => Promise<any[]>,
  fetchChapterContent: (bookId: string, chapterId: string) => Promise<any>,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  // Check storage limit
  const currentCount = await getDownloadedBookCount();
  if (currentCount >= MAX_OFFLINE_BOOKS) {
    throw new Error(`Storage limit reached. Maximum ${MAX_OFFLINE_BOOKS} books can be downloaded.`);
  }

  const db = await getDB();

  // Check if already downloaded
  const existing = await db.get('books', bookId);
  if (existing) {
    throw new Error('Book is already downloaded.');
  }

  // Fetch book details
  const book = await fetchBook(bookId);
  if (!book) throw new Error('Book not found.');

  // Fetch all chapters
  const chapters = await fetchChapters(bookId);
  const totalChapters = chapters.length;

  // Create book record
  await db.put('books', {
    id: bookId,
    title: book.title,
    cover_url: book.book_cover || null,
    author_name: book.author?.name || 'Unknown Author',
    downloaded_at: new Date().toISOString(),
    total_chapters: totalChapters,
    downloaded_chapters: 0,
    download_progress: 0,
  });

  // Download and encrypt each chapter
  let downloadedChapters = 0;
  for (const chapter of chapters) {
    const chapterData = await fetchChapterContent(bookId, chapter.id);

    const { encrypted, iv } = await encryptContent(chapterData.content);

    await db.put('chapters', {
      id: getChapterKey(bookId, chapter.id),
      book_id: bookId,
      chapter_id: chapter.id,
      title: chapterData.title,
      encrypted_content: encrypted,
      iv,
      chapter_number: chapterData.chapter_number,
      section_type: chapterData.section_type,
    });

    downloadedChapters++;
    const progress = (downloadedChapters / totalChapters) * 100;

    await db.put('books', {
      id: bookId,
      title: book.title,
      cover_url: book.book_cover || null,
      author_name: book.author?.name || 'Unknown Author',
      downloaded_at: new Date().toISOString(),
      total_chapters: totalChapters,
      downloaded_chapters: downloadedChapters,
      download_progress: progress,
    });

    if (onProgress) {
      onProgress({
        bookId,
        progress,
        totalChapters,
        downloadedChapters,
      });
    }
  }
}

// Delete a downloaded book
export async function deleteBook(bookId: string): Promise<void> {
  const db = await getDB();
  
  // Delete all chapters for this book
  const chapters = await db.getAllFromIndex('chapters', 'by-book', bookId);
  for (const chapter of chapters) {
    await db.delete('chapters', chapter.id);
  }

  // Delete book record
  await db.delete('books', bookId);
}

// Get a chapter content (decrypt if needed)
export async function getChapterContent(bookId: string, chapterId: string): Promise<string | null> {
  const db = await getDB();
  const chapter = await db.get('chapters', getChapterKey(bookId, chapterId));
  
  if (!chapter) return null;

  return await decryptContent(chapter.encrypted_content, chapter.iv);
}

// Save reading progress locally
export async function saveProgress(
  userId: string,
  bookId: string,
  chapterId: string,
  page: number,
  scrollRatio: number,
  fontSize: number
): Promise<void> {
  const db = await getDB();
  
  await db.put('progress', {
    id: getProgressKey(userId, bookId),
    user_id: userId,
    book_id: bookId,
    chapter_id: chapterId,
    page,
    scroll_ratio: scrollRatio,
    font_size: fontSize,
    updated_at: new Date().toISOString(),
    synced: false,
  });

  // Add to sync queue
  await addToSyncQueue('progress', {
    bookId,
    chapterId,
    page,
    scrollRatio,
    fontSize,
  });
}

// Get reading progress
export async function getProgress(userId: string, bookId: string) {
  const db = await getDB();
  return await db.get('progress', getProgressKey(userId, bookId));
}

// Add item to sync queue
async function addToSyncQueue(type: 'progress' | 'bookmark', payload: any): Promise<void> {
  const db = await getDB();
  const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  await db.put('sync_queue', {
    id,
    type,
    payload,
    created_at: new Date().toISOString(),
    attempts: 0,
  });
}

// Get all pending sync items
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return await db.getAll('sync_queue');
}

// Mark sync items as synced
export async function markSynced(ids: string[]): Promise<void> {
  const db = await getDB();
  for (const id of ids) {
    await db.delete('sync_queue', id);
  }
}

// Increment attempt count for failed sync
export async function incrementSyncAttempt(id: string): Promise<void> {
  const db = await getDB();
  const item = await db.get('sync_queue', id);
  if (item) {
    await db.put('sync_queue', {
      ...item,
      attempts: item.attempts + 1,
    });
  }
}

// Clear all offline data
export async function clearAllOfflineData(): Promise<void> {
  const db = await getDB();
  await db.clear('books');
  await db.clear('chapters');
  await db.clear('progress');
  await db.clear('sync_queue');
  await db.clear('library_cache');
}

// Cache library data (purchased books list)
export async function cacheLibraryData(userId: string, books: any[]): Promise<void> {
  const db = await getDB();
  await db.put('library_cache', {
    user_id: userId,
    books,
    cached_at: new Date().toISOString(),
  });
}

// Get cached library data
export async function getCachedLibraryData(userId: string): Promise<any[] | null> {
  const db = await getDB();
  const cached = await db.get('library_cache', userId);
  return cached?.books || null;
}

// Get cache age in milliseconds
export async function getLibraryCacheAge(userId: string): Promise<number | null> {
  const db = await getDB();
  const cached = await db.get('library_cache', userId);
  if (!cached) return null;
  return Date.now() - new Date(cached.cached_at).getTime();
}
