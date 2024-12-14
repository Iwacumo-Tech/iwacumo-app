"use client";

import "@fortawesome/fontawesome-free/css/all.min.css";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Author, Book, Chapter } from "@prisma/client";
import "react-quill/dist/quill.snow.css";
import BookReader from "./reader";

interface BookViewerProps {
  book: Book & {chapters: Chapter[]; author: Author | null};
}

export default function ViewBookPage ({ book }: BookViewerProps) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [editorKey, setEditorKey] = useState(0);
  const [editorContent, setEditorContent] = useState(""); // State for editor content

  useEffect(() => {
    const currentChapter = book.chapters[currentChapterIndex];

    const newContent = `
      <main className="bookContainer">
        <aside>
          <p style="font-size: 28px; font-weight: 700"> Chapter ${currentChapter.chapter_number} </p>
          <h1 style="font-size: 20px; font-weight: 600">${currentChapter.title} </h1>
          <p style="margin-bottom: 20px"> By ${book.author?.name ?? "Elvis Samuel"} </p>
          ${currentChapter.content}
        </aside>
      </main>
    `;

    setEditorContent(newContent);
  }, [currentChapterIndex, book.chapters, book.author?.name]);

  const handleNextChapter = () => {
    if (currentChapterIndex < book.chapters.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
      setEditorKey(prev => prev + 1);
    }

    console.log(editorKey);
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
      setEditorKey(prev => prev + 1);
    }
  };

  const currentChapter = book.chapters[currentChapterIndex];

  if(!book.chapters.length) return <p>Book not found</p>;

  return (
    <motion.div
      transition={{ type: "spring", damping: 40, mass: 0.75 }}
      initial={{ opacity: 0, x: 1000 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <motion.section
        transition={{ type: "spring", damping: 44, mass: 0.75 }}
        initial={{ opacity: 0, y: -1000 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-[90%] mx-auto justify-between items-center min-h-[5vh] my-2"
      >
        <div>
          <i
            style={iconStyle}
            className="fas fa-chevron-left"
            onClick={handlePrevChapter}
          ></i>
        </div>
        <div>
          <h2 className="text-center font-semibold uppercase">
            {book.title}
          </h2>
          <p className="text-xs text-center">Chapter {currentChapter.chapter_number}</p>
        </div>
        <div>
          <i
            style={iconStyle}
            className="fas fa-chevron-right"
            onClick={handleNextChapter}
          ></i>
        </div>
      </motion.section>
      <BookReader initialContent={editorContent} />
      <ToastContainer />
    </motion.div>
  );
}

const iconStyle = { marginRight: "20px", fontSize: "20px", cursor: "pointer" };
