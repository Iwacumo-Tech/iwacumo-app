import { publicProcedure } from "../trpc";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { TRPCError } from "@trpc/server";

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