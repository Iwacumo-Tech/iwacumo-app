// revelation/src/app/(app)/app/books/[id]/page.tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/app/_providers/trpc-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ChapterForm from "@/components/chapters/chapter-form";
import { Edit, Plus, ChevronLeft, BookOpen } from "lucide-react";
import Link from "next/link";

export default function BookDetailsPage() {
  const params = useParams();
  const bookId = params?.id as string;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  const { data: book, isLoading: isBookLoading } = trpc.getBookById.useQuery(
    { id: bookId },
    { enabled: !!bookId }
  );

  const { data: chapters, isLoading } = trpc.getAllChapterByBookId.useQuery(
    { book_id: bookId },
    { enabled: !!bookId && !!book?.text_url }
  );

  const handleEdit = (chapter: any) => {
    setSelectedChapter(chapter);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedChapter(null);
    setIsModalOpen(true);
  };

  if (isBookLoading) {
    return <div className="p-6">Loading book...</div>;
  }

  if (!book?.text_url) {
    return (
      <div className="p-6">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Chapters unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Chapter editing is only available for DOCX books that use the web reader.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 border-b-4 border-black pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/app/books" className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100">
            <ChevronLeft className="h-3 w-3" /> Back to Books
          </Link>
          <h1 className="mt-3 text-3xl font-black uppercase italic">
            Chapters<span className="text-accent">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {book.title} • Manage the web-reader chapter flow for this DOCX book.
          </p>
        </div>
        <Button onClick={handleAdd} className="rounded-none border-2 border-black bg-black text-white">
          <Plus className="mr-2 h-4 w-4" /> Add Chapter
        </Button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <p>Loading chapters...</p>
        ) : chapters?.length ? (
          chapters.map((chapter) => (
            <div key={chapter.id} className="flex items-center justify-between gap-4 border-2 border-black bg-white p-4 gumroad-shadow">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Chapter {chapter.chapter_number}</p>
                <h3 className="text-lg font-semibold">{chapter.title}</h3>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-none border-2 border-black" onClick={() => handleEdit(chapter)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="border-2 border-dashed border-black/20 bg-white p-10 text-center">
            <BookOpen className="mx-auto h-10 w-10 opacity-30" />
            <h2 className="mt-4 text-xl font-black uppercase italic">No Chapters Yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Add the first chapter to shape how this book appears in the reader.
            </p>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedChapter ? "Edit Chapter" : "Add New Chapter"}</DialogTitle>
          </DialogHeader>
          <ChapterForm 
            bookId={bookId} 
            chapter={selectedChapter} 
            setShowForm={setIsModalOpen}
            onSuccess={() => setIsModalOpen(false)} 
            action={selectedChapter ? "Edit" : "Add"}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
