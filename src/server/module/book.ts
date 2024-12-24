import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { createBookSchema, deleteBookSchema, findBookByIdSchema, toggleFeaturedSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";

// export const createBook = publicProcedure.input(createBookSchema).mutation(async (opts) => {
//   const session = await auth();

//   if(!session) {
//     console.error("User session not found");

//     return;
//   }

//   const creator = await prisma.user.findUnique({
//     where: { id: session.user.id },
//     include: { publisher: true }
//   });

//   return await prisma.book.create({
//     data: {
//       title: opts.input.title ?? "",
//       description: opts.input.description ?? "",
//       price: opts.input.price ?? 0,
//       published: opts.input.published ?? false,
//       pdf_url: opts.input.pdf_url ?? "",
//       text_url: opts.input.text_url ?? "",
//       book_cover: opts.input.book_cover ,
//       publisher_id: creator?.publisher?.id
//     },
//   });
// });

export const createBook = publicProcedure.input(createBookSchema).mutation(async (opts) => {
  const session = await auth();

  if (!session) {
    console.error("User session not found");
    return;
  }

  const creator = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { publisher: true },
  });

  if (!creator) {
    throw new Error("Creator not found");
  }

  // Validate if the author exists
  const authorExists = await prisma.author.findUnique({
    where: { id: opts.input.author_id },
  });

  if (!authorExists) {
    throw new Error("Author not found");
  }

   const tagArray = opts.input.tags
      ? opts.input.tags.split("*").map(tag => tag.trim())
      : [];
  return await prisma.book.create({
    data: {
      title: opts.input.title ?? "",
      short_description: opts.input.short_description ?? null,
      long_description: opts.input.long_description ?? null,
      price: opts.input.price ?? 0,
      tags: tagArray,
      paper_back: opts.input.paper_back ?? false,
      e_copy: opts.input.e_copy ?? false,
      hard_cover: opts.input.hard_cover ?? false,
      published: opts.input.published ?? false,
      pdf_url: opts.input.pdf_url ?? "",
      text_url: opts.input.text_url ?? "",
      author: {
        connect: {
          id: opts.input.author_id,
        },
      },
      book_cover: opts.input.book_cover,
      book_cover2: opts.input.book_cover2,
      book_cover3: opts.input.book_cover3,
      book_cover4: opts.input.book_cover4,
      // publisher : {
      //   connect : {
      //     id: opts.input.publisher_id,
      //   }
      // },
    },
  });
});

export const updateBook = publicProcedure.input(createBookSchema).mutation(async (opts) => {

   const tagArray = opts.input.tags
      ? opts.input.tags.split("*").map(tag => tag.trim())
      : [];
  return await prisma.book.update({
    where: { id: opts.input.id },
    data: {
      title: opts.input.title,
      short_description: opts.input.short_description,
      long_description: opts.input.long_description,
      price: opts.input.price,
      tags: tagArray,
      published: opts.input.published,
      pdf_url: opts.input.pdf_url,
      text_url: opts.input.text_url,
      book_cover: opts.input.book_cover,
       book_cover2: opts.input.book_cover2,
      book_cover3: opts.input.book_cover3,
      book_cover4: opts.input.book_cover4,

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
  return await prisma.book.findMany({ where: { deleted_at: null }, include: { chapters: true, author: true} });
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



export const toggleBookFeatured = publicProcedure
  .input(toggleFeaturedSchema)
  .mutation(async ({ input }) => {
    const book = await prisma.book.findUnique({ where: { id: input.id } });

    if (!book) {
      throw new Error("Book not found");
    }

    return await prisma.book.update({
      where: { id: input.id },
      data: { featured: !book.featured },
    });
  });

export const getAllFeaturedBooks = publicProcedure.query(async () => {
  return await prisma.book.findMany({
    where: { 
      featured: true,      
      deleted_at: null,    
    },
    include: { 
      chapters: true,     
      author: true,        
    },
  });
});

export const getNewArrivalBooks = publicProcedure.query(async () => {
  return await prisma.book.findMany({
    where: { 
      deleted_at: null, 
    },
    orderBy: { 
      created_at: "desc", 
    },
    include: { 
      chapters: true,    
      author: true,     
    },
    take: 12, 
  });
});
