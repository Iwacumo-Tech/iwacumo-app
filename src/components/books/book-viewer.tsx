"use client";

import "@fortawesome/fontawesome-free/css/all.min.css";
import { motion } from "framer-motion";
import { useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Author, Book, Chapter } from "@prisma/client";
import "react-quill/dist/quill.snow.css";
import BookReader from "./reader";
import { trpc } from "@/app/_providers/trpc-provider";
import { FileDown, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

interface BookViewerProps {
  book: Book & { chapters: Chapter[]; author: Author | null };
}

export default function ViewBookPage({ book }: BookViewerProps) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // tRPC Mutation to trigger the watermarking
  const watermarkMutation = trpc.generateWatermarkedEbook.useMutation({
    onSuccess: (data) => {
      const link = document.createElement("a");
      link.href = data.url;
      link.download = `${book.title}_Secure_Copy.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsGenerating(false);
      toast.success("Secure PDF generated successfully!");
    },
    onError: (err) => {
      setIsGenerating(false);
      toast.error(`Error: ${err.message}`);
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

  const currentChapter = book.chapters[currentChapterIndex];

  // LOGIC: If the book has a PDF URL, prioritize the Secure Download flow
  if (book.pdf_url) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center">
        <div className="relative mb-8">
          <div className="bg-blue-50 p-8 rounded-full">
            <FileDown className="w-20 h-20 text-blue-600" />
          </div>
          <ShieldCheck className="w-10 h-10 text-green-500 absolute -bottom-2 -right-2 bg-white rounded-full p-1 border shadow-sm" />
        </div>

        <h2 className="text-3xl font-bold mb-3">{book.title}</h2>
        <p className="text-gray-500 max-w-md mb-8">
          This digital edition is protected. We will generate a secure PDF
          watermarked with your credentials for your personal use.
        </p>

        <Button 
          size="lg" 
          className="h-16 px-10 text-lg shadow-lg"
          onClick={handleDownload}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Applying Watermark...
            </>
          ) : (
            "Generate & Download PDF"
          )}
        </Button>
        <ToastContainer />
      </div>
    );
  }

  // FALLBACK: Standard Reader for Text/DOCX books
  if (!book.chapters.length) return <p className="text-center p-20">No readable content found for this book.</p>;

  return (
    <motion.div
      transition={{ type: "spring", damping: 40, mass: 0.75 }}
      initial={{ opacity: 0, x: 1000 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <motion.section
        className="flex w-[90%] mx-auto justify-between items-center min-h-[5vh] my-2"
      >
        <i style={iconStyle} className="fas fa-chevron-left" onClick={handlePrevChapter}></i>
        <div>
          <h2 className="text-center font-semibold uppercase">{book.title}</h2>
          <p className="text-xs text-center">Chapter {currentChapter.chapter_number}</p>
        </div>
        <i style={iconStyle} className="fas fa-chevron-right" onClick={handleNextChapter}></i>
      </motion.section>

      <BookReader bookId={book.id} initialChapterId={currentChapter?.id} />
      <ToastContainer />
    </motion.div>
  );
}

const iconStyle = { fontSize: "20px", cursor: "pointer" };