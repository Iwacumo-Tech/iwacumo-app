// revelation/src/app/(app)/app/books/[id]/page.tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/app/_providers/trpc-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ChapterForm from "@/components/chapters/chapter-form";
import { Edit, Plus } from "lucide-react";

export default function BookDetailsPage() {
  const params = useParams();
  const bookId = params?.id as string;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);

  const { data: chapters, isLoading } = trpc.getAllChapterByBookId.useQuery(
    { book_id: bookId },
    { enabled: !!bookId }
  );

  const handleEdit = (chapter: any) => {
    setSelectedChapter(chapter);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedChapter(null);
    setIsModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Chapters</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Chapter
        </Button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <p>Loading chapters...</p>
        ) : chapters?.map((chapter) => (
          <div key={chapter.id} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm">
            <div>
              <p className="text-sm text-muted-foreground">Chapter {chapter.chapter_number}</p>
              <h3 className="font-semibold">{chapter.title}</h3>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleEdit(chapter)}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </Button>
            </div>
          </div>
        ))}
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