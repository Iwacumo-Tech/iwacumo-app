import prisma from "@/lib/prisma";
import { createChapterSchema, deleteChapterSchema, findChapterByIdSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";

export const createChapter = publicProcedure.input(createChapterSchema).mutation(async (opts)=> {
  const countWords = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const num = countWords(opts.input.content);

  return await prisma.chapter.create({
    data: {
      title: opts.input.title ?? "",
      content: opts.input.content ?? "",
      chapter_number: opts.input.chapter_number ?? 0,
      summary: opts.input.summary ?? "",
      word_count: num,
      book_id: opts.input.book_id ?? "",
    }
  });
});

export const updateChapter = publicProcedure.input(createChapterSchema).mutation(async (opts)=> {
  return await prisma.chapter.update({
    where: { id: opts.input.id },
    data: {
      title: opts.input.title ?? "",
      content: opts.input.content ?? "",
      chapter_number: opts.input.chapter_number,
      summary: opts.input.summary ?? "",
      word_count: opts.input.word_count,
    },
  });
});

export const deleteChapter = publicProcedure.input(deleteChapterSchema).mutation(async (opts)=> {
  return await prisma.chapter.update({
    where: { id: opts.input.id },
    data: { deleted_at: new Date() },
  });
});

export const getAllChapters = publicProcedure.query(async () => {
  return await prisma.chapter.findMany({ where: { deleted_at: null } });
});

export const getAllChapterByBookId = publicProcedure.input(findChapterByIdSchema).query(async (opts) => {
  return await prisma.chapter.findMany({
    where: {
      book_id: opts.input.book_id ?? "",
      deleted_at: null,
    },
    orderBy: { chapter_number: "asc" },
  });
});

export const viewChapterById = publicProcedure.input(findChapterByIdSchema).query(async (opts) => {
  return await prisma.chapter.findUnique({ where: { id: opts.input.id } });
});
