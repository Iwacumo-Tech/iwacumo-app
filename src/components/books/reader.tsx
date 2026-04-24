"use client";

import React, { useEffect, useState } from "react";
import { trpc } from "@/app/_providers/trpc-provider";
import { useBookStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Save, Bookmark, BookmarkPlus, Type } from "lucide-react";
import { useSession } from "next-auth/react";

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

interface ReaderBookmark {
  id: string;
  chapterId: string;
  chapterTitle: string;
  page: number;
  createdAt: string;
}

const Reader: React.FC<ReaderProps> = ({ bookId, initialChapterId }) => {
  const { content, setContent } = useBookStore();
  const { data: session } = useSession();
  
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
  const [fontSize, setFontSize] = useState(18);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [bookmarks, setBookmarks] = useState<ReaderBookmark[]>([]);
  const [readerContainer, setReaderContainer] = useState<HTMLDivElement | null>(null);
  const [chapterEdgeJump, setChapterEdgeJump] = useState<"start" | "end" | null>(null);

  const progressStorageKey = `reader_progress_local:${bookId}`;

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
  const { data: cloudProgress } = trpc.getReaderProgress.useQuery(
    { bookId },
    { enabled: !!bookId && !!session?.user?.id }
  );
  const saveReaderProgress = trpc.saveReaderProgress.useMutation();

  useEffect(() => {
    if (initialChapterId && initialChapterId !== activeChapterId) {
      setActiveChapterId(initialChapterId);
    }
  }, [initialChapterId]);

  // Sync initial content to store when chapter changes
  useEffect(() => {
    if (chapterData?.content) {
      const savedChapterNotes =
        activeChapterId ? localStorage.getItem(`book_${bookId}_chapter_${activeChapterId}`) : null;
      setContent(savedChapterNotes || chapterData.content);
      setPendingChanges(null);
    }
  }, [chapterData, setContent, activeChapterId, bookId]);

  // Set first chapter if none provided
  useEffect(() => {
    if (chapters && chapters.length > 0 && !activeChapterId) {
      setActiveChapterId(chapters[0].id);
    }
  }, [chapters, activeChapterId]);

  useEffect(() => {
    try {
      const localProgressRaw = localStorage.getItem(progressStorageKey);
      const localProgress = localProgressRaw ? JSON.parse(localProgressRaw) : null;
      const sourceProgress = (cloudProgress as any) ?? localProgress;

      if (sourceProgress?.fontSize) {
        setFontSize(sourceProgress.fontSize);
      }
      if (Array.isArray(sourceProgress?.bookmarks)) {
        setBookmarks(sourceProgress.bookmarks);
      }
      if (sourceProgress?.chapterId && !initialChapterId) {
        setActiveChapterId(sourceProgress.chapterId);
      }
    } catch {
      // Ignore local progress parse issues and continue with defaults.
    }
  }, [cloudProgress, initialChapterId, progressStorageKey]);

  useEffect(() => {
    if (!readerContainer) return;

    const updatePagination = () => {
      const nextPageCount = Math.max(1, Math.ceil(readerContainer.scrollHeight / readerContainer.clientHeight));
      const nextCurrentPage = Math.min(
        nextPageCount,
        Math.max(1, Math.floor(readerContainer.scrollTop / readerContainer.clientHeight) + 1)
      );
      setPageCount(nextPageCount);
      setCurrentPage(nextCurrentPage);
    };

    updatePagination();
    readerContainer.addEventListener("scroll", updatePagination);
    window.addEventListener("resize", updatePagination);

    return () => {
      readerContainer.removeEventListener("scroll", updatePagination);
      window.removeEventListener("resize", updatePagination);
    };
  }, [readerContainer, content, pendingChanges, fontSize]);

  useEffect(() => {
    if (!readerContainer) return;
    const sourceProgress = cloudProgress as any;
    const chapterProgress = sourceProgress?.chapterId === activeChapterId ? sourceProgress : null;

    if (chapterEdgeJump) {
      requestAnimationFrame(() => {
        const maxScroll = Math.max(0, readerContainer.scrollHeight - readerContainer.clientHeight);
        readerContainer.scrollTo({ top: chapterEdgeJump === "end" ? maxScroll : 0 });
        setChapterEdgeJump(null);
      });
      return;
    }

    if (!chapterProgress) {
      readerContainer.scrollTo({ top: 0 });
      return;
    }

    requestAnimationFrame(() => {
      const maxScroll = Math.max(0, readerContainer.scrollHeight - readerContainer.clientHeight);
      readerContainer.scrollTo({ top: maxScroll * (chapterProgress.scrollRatio ?? 0) });
    });
  }, [activeChapterId, cloudProgress, readerContainer, content, pendingChanges, fontSize, chapterEdgeJump]);

  useEffect(() => {
    if (!activeChapterId || !readerContainer) return;

    const timeoutId = window.setTimeout(() => {
      const maxScroll = Math.max(1, readerContainer.scrollHeight - readerContainer.clientHeight);
      const scrollRatio = Math.min(1, readerContainer.scrollTop / maxScroll);
      const payload = {
        bookId,
        chapterId: activeChapterId,
        page: currentPage,
        pageCount,
        scrollRatio,
        fontSize,
        bookmarks,
      };

      localStorage.setItem(progressStorageKey, JSON.stringify(payload));

      if (session?.user?.id) {
        saveReaderProgress.mutate(payload);
      }
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [activeChapterId, bookId, currentPage, pageCount, fontSize, bookmarks, readerContainer?.scrollTop, session?.user?.id]);

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

  const handlePrevPage = () => {
    if (!readerContainer) return;
    if (currentPage <= 1) {
      if (chapters && currentIndex > 0) {
        setChapterEdgeJump("end");
        setActiveChapterId(chapters[currentIndex - 1].id);
      }
      return;
    }
    readerContainer.scrollBy({ top: -readerContainer.clientHeight, behavior: "smooth" });
  };

  const handleNextPage = () => {
    if (!readerContainer) return;
    if (currentPage >= pageCount) {
      if (chapters && currentIndex < chapters.length - 1) {
        setChapterEdgeJump("start");
        setActiveChapterId(chapters[currentIndex + 1].id);
      }
      return;
    }
    readerContainer.scrollBy({ top: readerContainer.clientHeight, behavior: "smooth" });
  };

  const handleAddBookmark = () => {
    if (!activeChapterId) return;

    const nextBookmark: ReaderBookmark = {
      id: `${activeChapterId}-${currentPage}`,
      chapterId: activeChapterId,
      chapterTitle: chapterData?.title || `Chapter ${currentPage}`,
      page: currentPage,
      createdAt: new Date().toISOString(),
    };

    setBookmarks((currentBookmarks) => {
      if (currentBookmarks.some((bookmark) => bookmark.id === nextBookmark.id)) {
        return currentBookmarks;
      }

      return [nextBookmark, ...currentBookmarks].slice(0, 20);
    });
  };

  const jumpToBookmark = (bookmark: ReaderBookmark) => {
    setActiveChapterId(bookmark.chapterId);

    requestAnimationFrame(() => {
      if (!readerContainer) return;
      readerContainer.scrollTo({
        top: Math.max(0, (bookmark.page - 1) * readerContainer.clientHeight),
        behavior: "smooth",
      });
    });
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
      <div className="sticky top-0 z-10 border-b bg-background/95 p-3 backdrop-blur md:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold md:text-base">{chapterData?.title || "Loading Chapter..."}</h2>
          {pendingChanges && <span className="text-xs text-orange-500 font-medium animate-pulse">Unsaved changes</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="h-9 rounded-none px-3 text-xs md:text-sm" onClick={() => setFontSize((current) => Math.max(14, current - 2))}>
            <Type className="mr-1 h-4 w-4" /> A-
          </Button>
          <Button size="sm" variant="outline" className="h-9 rounded-none px-3 text-xs md:text-sm" onClick={() => setFontSize((current) => Math.min(28, current + 2))}>
            <Type className="mr-1 h-4 w-4" /> A+
          </Button>
          <Button size="sm" variant="outline" className="h-9 rounded-none px-3 text-xs md:text-sm" onClick={handleAddBookmark}>
            <BookmarkPlus className="mr-1 h-4 w-4" /> Bookmark
          </Button>
          <Button size="sm" variant="outline" className="h-9 rounded-none px-3 text-xs md:text-sm" onClick={handleSave} disabled={!pendingChanges}>
            <Save className="mr-1 h-4 w-4" /> Save Notes
          </Button>
        </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid gap-4 p-3 md:gap-6 md:p-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:p-8">
        <div
          ref={setReaderContainer}
          className="relative min-h-[60vh] max-h-[calc(100vh-240px)] overflow-y-auto rounded-xl border bg-white p-4 md:min-h-[70vh] md:p-8 lg:p-12"
        >
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-[95%]" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-[80%]" />
          </div>
        ) : (
          <div
            className="prose max-w-none focus:outline-none leading-relaxed md:prose-lg"
            style={{ fontSize: `${fontSize}px` }}
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

        <aside className="space-y-4 lg:sticky lg:top-28">
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-xs font-black uppercase tracking-widest opacity-40">Reading Progress</p>
            <p className="mt-2 text-sm font-bold">Page {currentPage} of {pageCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {session?.user?.id ? "Progress syncs to your account." : "Progress is saved on this device."}
            </p>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-black uppercase tracking-widest opacity-40">Bookmarks</p>
            {bookmarks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookmarks yet.</p>
            ) : (
              bookmarks.map((bookmark) => (
                <button
                  key={bookmark.id}
                  type="button"
                  onClick={() => jumpToBookmark(bookmark)}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-left hover:bg-accent/10"
                >
                  <p className="text-xs font-black uppercase tracking-widest opacity-40">
                    <Bookmark className="mr-1 inline h-3 w-3" />
                    Page {bookmark.page}
                  </p>
                  <p className="mt-1 text-sm font-bold">{bookmark.chapterTitle}</p>
                </button>
              ))
            )}
          </div>
        </aside>
      </div>

      {/* Navigation Footer */}
      <div className="flex flex-col gap-3 border-t bg-muted/20 p-3 md:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="outline" className="rounded-none text-xs md:text-sm" onClick={handlePrevPage} disabled={currentPage <= 1 && currentIndex <= 0}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous Page
          </Button>
          <Button variant="outline" className="rounded-none text-xs md:text-sm" onClick={handleNextPage} disabled={currentPage >= pageCount && (!chapters || currentIndex === chapters.length - 1)}>
            Next Page <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <span className="text-center text-xs text-muted-foreground md:text-sm">
          Chapter {currentIndex + 1} of {chapters?.length} · Page {currentPage}/{pageCount}
        </span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="outline" className="rounded-none text-xs md:text-sm" onClick={handlePrev} disabled={currentIndex <= 0}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous Chapter
          </Button>
          <Button variant="outline" className="rounded-none text-xs md:text-sm" onClick={handleNext} disabled={!chapters || currentIndex === chapters.length - 1}>
            Next Chapter <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Reader;
