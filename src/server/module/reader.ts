import { publicProcedure } from "../trpc";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { auth } from "@/auth";

/**
 * Reader Module
 * Implementation for Phase 4: In-browser Reader
 * Handles secure retrieval of chapter content for purchased or public books.
 */

export const getChapterContent = publicProcedure
  .input(
    z.object({
      bookId: z.string().min(1, "Book ID is required"),
      chapterId: z.string().min(1, "Chapter ID is required"),
    })
  )
  .query(async ({ input }) => {
    try {
      const { bookId, chapterId } = input;

      // Fetch the chapter and verify it belongs to the correct book
      const chapter = await prisma.chapter.findUnique({
        where: {
          id: chapterId,
        },
        include: {
          book: true,
        }
      });

      if (!chapter) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chapter not found",
        });
      }

      // Security check: Ensure the chapter belongs to the bookId provided
      if (chapter.book_id !== bookId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This chapter does not belong to the requested book",
        });
      }

      // Return the content and metadata needed by the Reader component
      return {
        id: chapter.id,
        title: chapter.title,
        content: chapter.content,
        chapter_number: chapter.chapter_number,
        book_title: chapter.book!.title,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      
      console.error("Error in getChapterContent:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred while fetching chapter content",
      });
    }
  });

const readerBookmarkSchema = z.object({
  id: z.string(),
  chapterId: z.string(),
  chapterTitle: z.string(),
  page: z.number().int().min(1),
  createdAt: z.string(),
});

export const getReaderProgress = publicProcedure
  .input(
    z.object({
      bookId: z.string().min(1, "Book ID is required"),
    })
  )
  .query(async ({ input }) => {
    const session = await auth();

    if (!session?.user?.id) {
      return null;
    }

    const key = `reader_progress:${session.user.id}:${input.bookId}`;
    const progress = await prisma.systemSettings.findUnique({
      where: { key },
    });

    return progress?.value ?? null;
  });

export const saveReaderProgress = publicProcedure
  .input(
    z.object({
      bookId: z.string().min(1, "Book ID is required"),
      chapterId: z.string().min(1, "Chapter ID is required"),
      page: z.number().int().min(1),
      pageCount: z.number().int().min(1),
      scrollRatio: z.number().min(0).max(1),
      fontSize: z.number().min(12).max(32),
      bookmarks: z.array(readerBookmarkSchema).max(20).default([]),
    })
  )
  .mutation(async ({ input }) => {
    const session = await auth();

    if (!session?.user?.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Please sign in to sync your reading progress.",
      });
    }

    const key = `reader_progress:${session.user.id}:${input.bookId}`;

    return prisma.systemSettings.upsert({
      where: { key },
      update: {
        value: {
          ...input,
          updatedAt: new Date().toISOString(),
        },
      },
      create: {
        key,
        value: {
          ...input,
          updatedAt: new Date().toISOString(),
        },
      },
    });
  });
