import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { createBookSchema, deleteBookSchema, findBookByIdSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";

export const createBook = publicProcedure.input(createBookSchema).mutation(async (opts) => {
  const session = await auth();

  if(!session) {
    console.error("User session not found");

    return;
  }

  const creator = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { publisher: true }
  });

  return await prisma.book.create({
    data: {
      title: opts.input.title ?? "",
      description: opts.input.description ?? "",
      price: opts.input.price ?? 0,
      published: opts.input.published ?? false,
      pdf_url: opts.input.pdf_url ?? "",
      text_url: opts.input.text_url ?? "",
      author_id: opts.input.author_id,
      book_cover: opts.input.book_cover,
      publisher_id: creator?.publisher?.id
    },
  });
});

export const updateBook = publicProcedure.input(createBookSchema).mutation(async (opts) => {
  return await prisma.book.update({
    where: { id: opts.input.id },
    data: {
      title: opts.input.title,
      description: opts.input.description,
      price: opts.input.price,
      published: opts.input.published,
      pdf_url: opts.input.pdf_url,
      text_url: opts.input.text_url,
      book_cover: opts.input.book_cover

    },
  });
});

export const deleteBook = publicProcedure.input(deleteBookSchema).mutation(async (opts) => {
  return await prisma.book.update({
    where: { id: opts.input.id },
    data: { deleted_at: new Date() },
  });
});

export const getAllBooks = publicProcedure.query(async () => {
  return await prisma.book.findMany({ where: { deleted_at: null }, include: { chapters: true, author: true } });
});

export const getBookById = publicProcedure.input(findBookByIdSchema).query(async (opts) => {
  return await prisma.book.findUnique({
    where: {
      id: opts.input.id,
      deleted_at: null,
    },
    include: { author: true, chapters: true }
  });
});

export const getBookByAuthor = publicProcedure.input(findBookByIdSchema).query(async (opts) => {
  const user = await prisma.user.findUnique({
    where: { id: opts.input.id },
    include: { author: true, publisher: true }
  });

  if(user && user.publisher) {
    return await prisma.book.findMany({
      where: { publisher_id: user.publisher.id, deleted_at: null },
      include: { chapters: true, author: true }
    });
  }

  if(user && user.author) {
    return await prisma.book.findMany({
      where: { author_id: user.author.id, deleted_at: null },
      include: { chapters: true, author: true }
    });
  }
});
