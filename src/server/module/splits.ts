

import prisma from "@/lib/prisma";
import { z } from "zod";
import { publicProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolvePublisherId(userId: string): Promise<string> {
  const publisher = await prisma.publisher.findUnique({
    where:  { user_id: userId },
    select: { id: true },
  });
  if (!publisher) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You are not registered as a publisher." });
  }
  return publisher.id;
}

async function isSuperAdmin(userId: string): Promise<boolean> {
  const claim = await prisma.claim.findFirst({
    where: { user_id: userId, role_name: "super-admin", active: true },
  });
  return !!claim;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const setPublisherAuthorSplitSchema = z.object({
  author_id:               z.string(),
  publisher_split_percent: z.number().min(0).max(95),
  notes:                   z.string().max(300).optional(),
  publisher_id:            z.string().optional(),
});

export const setBookSplitOverrideSchema = z.object({
  book_id:                 z.string(),
  publisher_split_percent: z.number().min(0).max(95),
  notes:                   z.string().max(300).optional(),
});

export const deleteBookSplitOverrideSchema = z.object({
  book_id: z.string(),
});

// Making the input object optional so the page can call it with no arguments
export const getPublisherSplitsSchema = z.object({
  publisher_id: z.string().optional(),
}).optional();

// ─── getPublisherSplits ───────────────────────────────────────────────────────

export const getPublisherSplits = publicProcedure
  .input(getPublisherSplitsSchema)
  .query(async ({ ctx, input }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated." });
    }
    const userId = ctx.session.user.id;
    const admin  = await isSuperAdmin(userId);

    const publisherId = (input?.publisher_id && admin)
      ? input.publisher_id
      : await resolvePublisherId(userId);

    // Schema confirms: Author has `user`, `publisher_splits`, `books` relations.
    // Book has `split_override` relation.
    const authors = await prisma.author.findMany({
      where:   { publisher_id: publisherId, deleted_at: null },
      include: {
        user:             { select: { first_name: true, last_name: true, email: true } },
        publisher_splits: { where: { publisher_id: publisherId }, take: 1 },
        books: {
          where:   { publisher_id: publisherId, deleted_at: null },
          include: { split_override: true },
          orderBy: { created_at: "desc" },
        },
      },
      orderBy: { created_at: "asc" },
    });

    return {
      publisher_id: publisherId,
      authors: authors.map((author) => ({
        id:    author.id,
        name:  author.name || `${author.user.first_name} ${author.user.last_name || ""}`.trim(),
        email: author.user.email,
        default_split: author.publisher_splits[0]
          ? {
              id:                      author.publisher_splits[0].id,
              publisher_split_percent: author.publisher_splits[0].publisher_split_percent,
              notes:                   author.publisher_splits[0].notes,
            }
          : null,
        books: author.books.map((book) => ({
          id:             book.id,
          title:          book.title,
          status:         book.status,
          published:      book.published,
          split_override: book.split_override
            ? {
                id:                      book.split_override.id,
                publisher_split_percent: book.split_override.publisher_split_percent,
                notes:                   book.split_override.notes,
              }
            : null,
        })),
      })),
    };
  });

// ─── setPublisherAuthorSplit ──────────────────────────────────────────────────

export const setPublisherAuthorSplit = publicProcedure
  .input(setPublisherAuthorSplitSchema)
  .mutation(async ({ ctx, input }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated." });
    }
    const userId = ctx.session.user.id;
    const admin  = await isSuperAdmin(userId);

    const publisherId = (input.publisher_id && admin)
      ? input.publisher_id
      : await resolvePublisherId(userId);

    const author = await prisma.author.findFirst({
      where: { id: input.author_id, publisher_id: publisherId },
    });
    if (!author) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Author not found under your publisher account." });
    }

    return await prisma.publisherAuthorSplit.upsert({
      where:  { publisher_id_author_id: { publisher_id: publisherId, author_id: input.author_id } },
      create: {
        publisher_id:            publisherId,
        author_id:               input.author_id,
        publisher_split_percent: input.publisher_split_percent,
        notes:                   input.notes ?? null,
      },
      update: {
        publisher_split_percent: input.publisher_split_percent,
        notes:                   input.notes ?? null,
      },
    });
  });

// ─── setBookSplitOverride ─────────────────────────────────────────────────────

export const setBookSplitOverride = publicProcedure
  .input(setBookSplitOverrideSchema)
  .mutation(async ({ ctx, input }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated." });
    }
    const userId = ctx.session.user.id;
    const admin  = await isSuperAdmin(userId);

    const book = await prisma.book.findUnique({
      where:  { id: input.book_id },
      select: { id: true, publisher_id: true },
    });
    if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "Book not found." });

    if (!admin) {
      const publisherId = await resolvePublisherId(userId);
      if (book.publisher_id !== publisherId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This book does not belong to your publisher account." });
      }
    }

    return await prisma.bookSplitOverride.upsert({
      where:  { book_id: input.book_id },
      create: {
        book_id:                 input.book_id,
        publisher_split_percent: input.publisher_split_percent,
        notes:                   input.notes ?? null,
      },
      update: {
        publisher_split_percent: input.publisher_split_percent,
        notes:                   input.notes ?? null,
      },
    });
  });

// ─── deleteBookSplitOverride ──────────────────────────────────────────────────

export const deleteBookSplitOverride = publicProcedure
  .input(deleteBookSplitOverrideSchema)
  .mutation(async ({ ctx, input }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated." });
    }
    const userId = ctx.session.user.id;
    const admin  = await isSuperAdmin(userId);

    const book = await prisma.book.findUnique({
      where:  { id: input.book_id },
      select: { id: true, publisher_id: true },
    });
    if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "Book not found." });

    if (!admin) {
      const publisherId = await resolvePublisherId(userId);
      if (book.publisher_id !== publisherId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This book does not belong to your publisher account." });
      }
    }

    await prisma.bookSplitOverride.deleteMany({ where: { book_id: input.book_id } });
    return { success: true, book_id: input.book_id };
  });