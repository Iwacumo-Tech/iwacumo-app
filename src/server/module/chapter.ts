import prisma from "@/lib/prisma";
import { createChapterSchema, deleteChapterSchema, findChapterByIdSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";

function removeDocxImagePlaceholders(content: string) {
  let removed = 0;
  let cleaned = content;
  const patterns = [
    /<span\b[^>]*data-docx-image-placeholder=["']true["'][^>]*>[\s\S]*?<\/span>/gi,
    /<img\b[^>]*src=["']about:blank["'][^>]*>/gi,
    /\[Image omitted\]/gi,
  ];

  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, () => {
      removed += 1;
      return "";
    });
  }

  return {
    content: cleaned.replace(/<p(?:\s[^>]*)?>\s*<\/p>/gi, "").trim(),
    removed,
  };
}

export const createChapter = publicProcedure.input(createChapterSchema).mutation(async (opts)=> {
  const countWords = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const num = countWords(opts.input.content);
  const lastChapter = opts.input.sort_order === undefined && opts.input.book_id
    ? await prisma.chapter.aggregate({
        where: { book_id: opts.input.book_id, deleted_at: null },
        _max: { sort_order: true },
      })
    : null;

  return await prisma.chapter.create({
    data: {
      title: opts.input.title ?? "",
      content: opts.input.content ?? "",
      chapter_number: opts.input.chapter_number ?? 0,
      section_type: opts.input.section_type ?? "chapter",
      sort_order: opts.input.sort_order ?? ((lastChapter?._max.sort_order ?? -1) + 1),
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
      chapter_number: opts.input.chapter_number ?? 0,
      section_type: opts.input.section_type ?? "chapter",
      sort_order: opts.input.sort_order ?? 0,
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
  return await prisma.chapter.findMany({
    where: { deleted_at: null },
    orderBy: [{ sort_order: "asc" }, { chapter_number: "asc" }, { created_at: "asc" }],
  });
});

export const removeChapterImagePlaceholders = publicProcedure
  .input(findChapterByIdSchema)
  .mutation(async ({ input }) => {
    const chapters = await prisma.chapter.findMany({
      where: { book_id: input.book_id, deleted_at: null },
      select: { id: true, content: true },
    });

    const updates = chapters
      .map((chapter) => {
        const cleaned = removeDocxImagePlaceholders(chapter.content);
        if (cleaned.removed === 0) return null;

        const content = cleaned.content;
        const word_count = content.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;

        return { id: chapter.id, content, word_count, removed: cleaned.removed };
      })
      .filter((update): update is { id: string; content: string; word_count: number; removed: number } => Boolean(update));

    if (updates.length > 0) {
      await prisma.$transaction(async (tx) => {
        await Promise.all(
          updates.map((update) =>
            tx.chapter.update({
              where: { id: update.id },
              data: { content: update.content, word_count: update.word_count },
            }),
          ),
        );
        await tx.documentProcessingJob.updateMany({
          where: { book_id: input.book_id },
          data: { images_skipped: 0 },
        });
      });
    }

    return {
      updated_sections: updates.length,
      removed_placeholders: updates.reduce((total, update) => total + update.removed, 0),
    };
  });

export const getAllChapterByBookId = publicProcedure.input(findChapterByIdSchema).query(async (opts) => {
  return await prisma.chapter.findMany({
    where: {
      book_id: opts.input.book_id ?? "",
      deleted_at: null,
    },
    orderBy: [{ sort_order: "asc" }, { chapter_number: "asc" }, { created_at: "asc" }],
  });
});

export const viewChapterById = publicProcedure.input(findChapterByIdSchema).query(async (opts) => {
  return await prisma.chapter.findUnique({ where: { id: opts.input.id } });
});
