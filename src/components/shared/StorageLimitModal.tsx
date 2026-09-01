"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, BookOpen } from 'lucide-react';
import { getDownloadedBooks, deleteBook } from '@/lib/offline-manager';
import Image from 'next/image';

interface StorageLimitModalProps {
  open: boolean;
  onClose: () => void;
  onSpaceFreed: () => void;
}

interface DownloadedBook {
  id: string;
  title: string;
  cover_url: string | null;
  author_name: string;
  downloaded_at: string;
  total_chapters: number;
  downloaded_chapters: number;
  download_progress: number;
}

export default function StorageLimitModal({ open, onClose, onSpaceFreed }: StorageLimitModalProps) {
  const [books, setBooks] = useState<DownloadedBook[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadBooks();
    }
  }, [open]);

  const loadBooks = async () => {
    const downloadedBooks = await getDownloadedBooks();
    setBooks(downloadedBooks);
  };

  const handleDelete = async (bookId: string) => {
    setDeleting(bookId);
    try {
      await deleteBook(bookId);
      await loadBooks();
      onSpaceFreed();
    } catch (error) {
      console.error('Failed to delete book:', error);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase italic">
            Storage Limit Reached
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            You've reached the maximum of 10 offline books. Delete some books to download more.
          </p>

          <div className="space-y-3">
            {books.map((book) => (
              <div
                key={book.id}
                className="flex items-center gap-3 p-3 border-2 border-black rounded-lg"
              >
                <div className="relative w-12 h-16 border border-black shrink-0">
                  {book.cover_url ? (
                    <Image
                      src={book.cover_url}
                      alt={book.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <BookOpen size={20} className="text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-black uppercase italic text-sm truncate">{book.title}</p>
                  <p className="text-xs text-gray-500 truncate">{book.author_name}</p>
                  <p className="text-[10px] text-gray-400">
                    {book.downloaded_chapters}/{book.total_chapters} chapters
                  </p>
                </div>

                <Button
                  onClick={() => handleDelete(book.id)}
                  disabled={deleting === book.id}
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  <Trash2 size={14} className="mr-1" />
                  Delete
                </Button>
              </div>
            ))}
          </div>

          {books.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-8">
              No downloaded books found.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
