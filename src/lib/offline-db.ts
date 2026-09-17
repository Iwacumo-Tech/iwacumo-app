import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface OfflineDB extends DBSchema {
  books: {
    key: string;
    value: {
      id: string;
      title: string;
      cover_url: string | null;
      author_name: string;
      downloaded_at: string;
      total_chapters: number;
      downloaded_chapters: number;
      download_progress: number;
    };
    indexes: { 'by-downloaded': string };
  };
  chapters: {
    key: string;
    value: {
      id: string;
      book_id: string;
      chapter_id: string;
      title: string;
      encrypted_content: ArrayBuffer;
      iv: ArrayBuffer;
      chapter_number: number;
      section_type: string;
    };
    indexes: { 'by-book': string };
  };
  progress: {
    key: string;
    value: {
      id: string;
      user_id: string;
      book_id: string;
      chapter_id: string;
      page: number;
      scroll_ratio: number;
      font_size: number;
      updated_at: string;
      synced: boolean;
    };
  };
  sync_queue: {
    key: string;
    value: {
      id: string;
      type: 'progress' | 'bookmark';
      payload: any;
      created_at: string;
      attempts: number;
    };
  };
  encryption_keys: {
    key: string;
    value: {
      device_id: string;
      key: CryptoKey;
      created_at: string;
    };
  };
  library_cache: {
    key: string;
    value: {
      user_id: string;
      books: any[];
      cached_at: string;
    };
  };
}

const DB_NAME = 'iwacumo-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<OfflineDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Books store
      if (!db.objectStoreNames.contains('books')) {
        const bookStore = db.createObjectStore('books', { keyPath: 'id' });
        bookStore.createIndex('by-downloaded', 'downloaded_at');
      }

      // Chapters store - using composite key as string
      if (!db.objectStoreNames.contains('chapters')) {
        const chapterStore = db.createObjectStore('chapters', { keyPath: 'id' });
        chapterStore.createIndex('by-book', 'book_id');
      }

      // Progress store - using composite key as string
      if (!db.objectStoreNames.contains('progress')) {
        db.createObjectStore('progress', { keyPath: 'id' });
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id' });
      }

      // Encryption keys store
      if (!db.objectStoreNames.contains('encryption_keys')) {
        db.createObjectStore('encryption_keys', { keyPath: 'device_id' });
      }

      // Library cache store
      if (!db.objectStoreNames.contains('library_cache')) {
        db.createObjectStore('library_cache', { keyPath: 'user_id' });
      }
    },
  });

  return dbInstance;
}

export async function closeDB() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// Helper functions for composite keys
export function getChapterKey(bookId: string, chapterId: string): string {
  return `${bookId}:${chapterId}`;
}

export function getProgressKey(userId: string, bookId: string): string {
  return `${userId}:${bookId}`;
}
