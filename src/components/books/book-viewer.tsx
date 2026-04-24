"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Author, Book, Chapter } from "@prisma/client";
import BookReader from "./reader";
import { trpc } from "@/app/_providers/trpc-provider";
import { 
  FileDown, 
  ShieldCheck, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BookViewerProps {
  book: Book & { chapters: Chapter[]; author: Author | null };
}

export default function ViewBookPage({ book }: BookViewerProps) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const hasReaderContent = !!book.text_url;

  const watermarkMutation = trpc.generateWatermarkedEbook.useMutation({
    onSuccess: async (data) => {
      try {
        const response = await fetch(data.url);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = data.filename ?? `${book.title}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.open(objectUrl, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        toast.success("Secure PDF generated successfully!");
      } catch {
        window.open(data.url, "_blank", "noopener,noreferrer");
        toast.success("Secure PDF opened successfully.");
      }
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
    
    onSettled: () => {
      setIsGenerating(false);
    }
  });

  const handleDownload = () => {
    setIsGenerating(true);
    watermarkMutation.mutate({ bookId: book.id });
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < book.chapters.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
    }
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
    }
  };

  // CASE A: SECURE PDF DOWNLOAD FLOW
  if (!hasReaderContent && book.pdf_url) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 bg-[#FAF9F6]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white border-[1.5px] border-black rounded-[var(--radius)] p-10 text-center gumroad-shadow"
        >
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-accent rounded-full animate-pulse opacity-20" />
            <div className="relative bg-white border-[1.5px] border-black rounded-full w-full h-full flex items-center justify-center">
              <Lock className="w-10 h-10 text-black" />
            </div>
            <ShieldCheck className="absolute -bottom-1 -right-1 w-8 h-8 text-green-500 bg-white rounded-full p-1 border-[1.5px] border-black" />
          </div>

          <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-4">
            Secure Access<span className="text-accent">.</span>
          </h2>
          
          <div className="space-y-4 mb-10">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
              {book.title}
            </p>
            <p className="text-sm font-medium leading-relaxed text-gray-600">
              This digital edition is protected. We are ready to generate a 
              <span className="font-bold text-black"> personalized, watermarked PDF</span> for your private library.
            </p>
          </div>

          <Button 
            size="lg" 
            className="w-full h-16 booka-button-primary text-md"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Encrypting...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-5 w-5" />
                Generate Secure PDF
              </>
            )}
          </Button>

          <p className="mt-6 text-[9px] font-bold uppercase opacity-30 tracking-tighter">
            Generation usually takes less than 10 seconds.
          </p>
        </motion.div>
        <ToastContainer position="bottom-center" />
      </div>
    );
  }

  const currentChapter = book.chapters[currentChapterIndex] ?? null;

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Reader Header */}
      <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b-[1.5px] border-black px-4 h-20">
        <div className="max-w-4xl mx-auto h-full flex items-center justify-between">
          <button 
            onClick={handlePrevChapter}
            disabled={!book.chapters.length || currentChapterIndex === 0}
            className="p-3 hover:bg-accent rounded-full transition-all border-[1.5px] border-transparent hover:border-black disabled:opacity-10"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="text-center">
            <h2 className="text-[13px] font-black uppercase italic tracking-tighter line-clamp-1">
              {book.title}
            </h2>
            {currentChapter ? (
              <p className="text-[9px] font-bold uppercase text-accent bg-black px-2 py-0.5 rounded-full inline-block mt-1">
                Chapter {currentChapter.chapter_number}
              </p>
            ) : (
              <p className="text-[9px] font-bold uppercase text-accent bg-black px-2 py-0.5 rounded-full inline-block mt-1">
                Web Reader
              </p>
            )}
          </div>

          <button 
            onClick={handleNextChapter}
            disabled={!book.chapters.length || currentChapterIndex === book.chapters.length - 1}
            className="p-3 hover:bg-accent rounded-full transition-all border-[1.5px] border-transparent hover:border-black disabled:opacity-10"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </header>

      {/* Main Reader Surface */}
      <main className="max-w-4xl mx-auto py-12 px-6">
        <motion.div
          key={currentChapter?.id ?? `${book.id}-reader`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <BookReader bookId={book.id} initialChapterId={currentChapter?.id} />
        </motion.div>
      </main>

      <ToastContainer />
    </div>
  );
}
