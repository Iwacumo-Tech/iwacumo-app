"use client";

import React, { useEffect, useState } from "react";
import { trpc } from "@/app/_providers/trpc-provider";
import { useBookStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Save, Settings, Type } from "lucide-react";

/**
 * Location: src/components/books/reader.tsx
 * * Phase B: Secure In-Browser Reader
 * * Merges secure content fetching with annotation/formatting logic.
 */

interface ReaderProps {
  bookId: string;
  initialChapterId?: string;
}

interface Comment {
  text: string;
  comment: string;
}

const Reader: React.FC<ReaderProps> = ({ bookId, initialChapterId }) => {
  const { content, setContent } = useBookStore();
  
  // State for Navigation
  const [activeChapterId, setActiveChapterId] = useState<string | undefined>(initialChapterId);
  
  // State for Formatting/Comments (Existing Logic)
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [showColorModal, setShowColorModal] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [pendingChanges, setPendingChanges] = useState<string | null>(null);

  // 1. Fetch Chapter List for Navigation
  const { data: chapters } = trpc.getAllChapterByBookId.useQuery(
    { book_id: bookId },
    { enabled: !!bookId }
  );

  // 2. Fetch Secure Chapter Content (Phase B Requirement)
  const { data: chapterData, isLoading, error } = trpc.getChapterContent.useQuery(
    { bookId, chapterId: activeChapterId || "" },
    { enabled: !!activeChapterId }
  );

  useEffect(() => {
    if (initialChapterId && initialChapterId !== activeChapterId) {
      setActiveChapterId(initialChapterId);
    }
  }, [initialChapterId]);

  // Sync initial content to store when chapter changes
  useEffect(() => {
    if (chapterData?.content) {
      setContent(chapterData.content);
      setPendingChanges(null);
    }
  }, [chapterData, setContent]);

  // Set first chapter if none provided
  useEffect(() => {
    if (chapters && chapters.length > 0 && !activeChapterId) {
      setActiveChapterId(chapters[0].id);
    }
  }, [chapters, activeChapterId]);

  // --- Formatting Logic (Maintained from your snippet) ---

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      setSelectedText(selection.toString());
      setModalPosition({ top: rect.top + window.scrollY - 50, left: rect.left });
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  };

  const applyBold = () => {
    if (selectedText) {
      const newContent = content.replace(selectedText, `<b>${selectedText}</b>`);
      setPendingChanges(newContent);
      setShowModal(false);
    }
  };

  const handleColorClick = () => {
    setShowModal(false);
    setShowColorModal(true);
  };

  const applyColor = (color: string) => {
    if (selectedText) {
      const newContent = content.replace(selectedText, `<span style="background-color:${color}; color: black; padding: 2px 4px; border-radius: 2px;">${selectedText}</span>`);
      setPendingChanges(newContent);
      setShowColorModal(false);
    }
  };

  const handleCommentClick = () => {
    setShowModal(false);
    setShowCommentBox(true);
  };

  const saveComment = (commentText: string) => {
    if (selectedText && commentText) {
      const newContent = content.replace(selectedText, `<span data-comment="${commentText}" style="border-bottom: 2px dashed #3b82f6; cursor: help;">${selectedText}</span>`);
      setComments([...comments, { text: selectedText, comment: commentText }]);
      setPendingChanges(newContent);
      setShowCommentBox(false);
    }
  };

  const handleMouseOver = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const commentText = target.getAttribute("data-comment");
    if (commentText) {
      const rect = target.getBoundingClientRect();
      setModalPosition({ top: rect.top + window.scrollY - 40, left: rect.left });
      // Logic for showing existing comment could go here
    }
  };

  const handleSave = () => {
    if (pendingChanges) {
      setContent(pendingChanges);
      localStorage.setItem(`book_${bookId}_chapter_${activeChapterId}`, pendingChanges);
      setPendingChanges(null);
    }
  };

  // Navigation handlers
  const currentIndex = chapters?.findIndex((c) => c.id === activeChapterId) ?? -1;
  const handleNext = () => {
    if (chapters && currentIndex < chapters.length - 1) setActiveChapterId(chapters[currentIndex + 1].id);
  };
  const handlePrev = () => {
    if (chapters && currentIndex > 0) setActiveChapterId(chapters[currentIndex - 1].id);
  };

  if (error) {
    return (
      <div className="p-8 text-center border rounded-lg bg-destructive/10">
        <p className="text-destructive font-medium">{error.message}</p>
        <Button className="mt-4" onClick={() => window.location.href = `/shop/${bookId}`}>View Book Details</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto bg-background min-h-[70vh]">
      {/* Header / Save Bar */}
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold">{chapterData?.title || "Loading Chapter..."}</h2>
          {pendingChanges && <span className="text-xs text-orange-500 font-medium animate-pulse">Unsaved changes</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleSave} disabled={!pendingChanges}>
            <Save className="h-4 w-4 mr-2" /> Save Notes
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-grow p-6 md:p-12">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-[95%]" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-[80%]" />
          </div>
        ) : (
          <div
            className="prose prose-lg dark:prose-invert max-w-none focus:outline-none leading-relaxed"
            onMouseUp={handleMouseUp}
            onMouseOver={handleMouseOver}
            dangerouslySetInnerHTML={{ __html: pendingChanges || content }}
          />
        )}

        {/* --- MODALS (Maintained from your snippet) --- */}
        
        {showModal && !showColorModal && !showCommentBox && (
          <div
            className="absolute bg-popover border rounded-lg shadow-lg p-1 flex gap-1 z-50 animate-in fade-in zoom-in duration-200"
            style={{ top: modalPosition.top - 40, left: modalPosition.left }}
          >
            <Button variant="ghost" size="sm" className="h-8 px-2 bg-yellow-100 hover:bg-yellow-200 text-black" onClick={handleColorClick}>Highlight</Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 bg-blue-100 hover:bg-blue-200 text-black" onClick={applyBold}>Bold</Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 bg-gray-100 hover:bg-gray-200 text-black" onClick={handleCommentClick}>Comment</Button>
          </div>
        )}

        {showColorModal && (
          <div
            className="absolute bg-popover border rounded-lg shadow-lg p-2 flex gap-1 z-50"
            style={{ top: modalPosition.top - 40, left: modalPosition.left }}
          >
            {["#fef08a", "#fecaca", "#bbf7d0", "#bfdbfe", "#e9d5ff", "#fed7aa"].map((color) => (
              <button
                key={color}
                className="w-6 h-6 rounded-full border border-black/10 transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
                onClick={() => applyColor(color)}
              />
            ))}
          </div>
        )}

        {showCommentBox && (
          <div
            className="absolute bg-popover border rounded-xl shadow-2xl p-4 w-64 z-50 animate-in slide-in-from-top-2"
            style={{ top: modalPosition.top, left: modalPosition.left }}
          >
            <textarea
              className="w-full text-sm bg-transparent border rounded-md p-2 focus:ring-1 focus:ring-primary outline-none"
              rows={3}
              autoFocus
              placeholder="Add your note here..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveComment((e.target as HTMLTextAreaElement).value);
                }
              }}
              onBlur={(e) => {
                if (e.target.value) saveComment(e.target.value);
                else setShowCommentBox(false);
              }}
            />
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between p-6 border-t bg-muted/20">
        <Button variant="outline" onClick={handlePrev} disabled={currentIndex <= 0}>
          <ChevronLeft className="h-4 w-4 mr-2" /> Previous Chapter
        </Button>
        <span className="text-sm text-muted-foreground">
          Chapter {currentIndex + 1} of {chapters?.length}
        </span>
        <Button variant="outline" onClick={handleNext} disabled={!chapters || currentIndex === chapters.length - 1}>
          Next Chapter <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default Reader;