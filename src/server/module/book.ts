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
  const authorId = opts.input.author_id || opts.input.primary_author_id;
  if (authorId) {
    const authorExists = await prisma.author.findUnique({
      where: { id: authorId },
    });

    if (!authorExists) {
      throw new Error("Author not found");
    }
  }

  // Validate that at least one book cover is provided (legacy support)
  const covers = [
    opts.input.book_cover,
    opts.input.book_cover2,
    opts.input.book_cover3,
    opts.input.book_cover4,
    opts.input.cover_image_url,
  ];
  
  const hasAtLeastOneCover = covers.some(
    (cover) => cover && typeof cover === "string" && cover.trim() !== ""
  );

  if (!hasAtLeastOneCover) {
    throw new Error("At least one book cover image is required");
  }

  // Validate that at least one variant is provided (new flow) or legacy format flags
  const hasVariants = opts.input.variants && opts.input.variants.length > 0;
  const hasLegacyFormats = opts.input.paper_back || opts.input.e_copy || opts.input.hard_cover;
  
  if (!hasVariants && !hasLegacyFormats) {
    throw new Error("At least one book variant is required. Please select a format (paperback, hardcover, ebook) or provide variant details.");
  }

  const tagArray = opts.input.tags
    ? opts.input.tags.split("*").map(tag => tag.trim())
    : opts.input.subject_tags || [];

  // Create the book first
  // Note: Type assertions needed until Prisma client is regenerated after migration
  const createdBook = await prisma.book.create({
    data: {
      title: opts.input.title ?? "",
      subtitle: (opts.input.subtitle ?? null) as any,
      slug: opts.input.slug ?? null,
      description: opts.input.description ?? opts.input.short_description ?? null,
      synopsis: opts.input.synopsis ?? opts.input.long_description ?? null,
      cover_image_url: opts.input.cover_image_url ?? opts.input.book_cover ?? null,
      genre: opts.input.genre ?? null,
      subject_tags: tagArray,
      edition: opts.input.edition ?? null,
      publication_date: opts.input.publication_date ?? null,
      default_language: opts.input.default_language ?? "en",
      page_count: opts.input.page_count ?? null,
      reading_age_min: opts.input.reading_age_min ?? null,
      reading_age_max: opts.input.reading_age_max ?? null,
      status: opts.input.status ?? "draft",
      // Legacy fields for backward compatibility
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
      book_cover: opts.input.book_cover ?? null,
      book_cover2: opts.input.book_cover2 ?? null,
      book_cover3: opts.input.book_cover3 ?? null,
      book_cover4: opts.input.book_cover4 ?? null,
      featured: opts.input.featured ?? false,
      author: authorId ? {
        connect: {
          id: authorId,
        },
      } : undefined,
      primary_author: opts.input.primary_author_id ? {
        connect: {
          id: opts.input.primary_author_id,
        },
      } : undefined,
    },
  });

  // Create variants if provided
  // Note: After running migration, regenerate Prisma client with: npx prisma generate
  if (opts.input.variants && opts.input.variants.length > 0) {
    await (prisma as any).bookVariant.createMany({
      data: opts.input.variants.map((variant) => ({
        book_id: createdBook.id,
        format: variant.format,
        isbn13: variant.isbn13 ?? null,
        language: variant.language ?? "en",
        list_price: variant.list_price,
        currency: variant.currency ?? "USD",
        discount_price: variant.discount_price ?? null,
        stock_quantity: variant.stock_quantity ?? 0,
        sku: variant.sku ?? null,
        digital_asset_url: variant.digital_asset_url ?? null,
        weight_grams: variant.weight_grams ?? null,
        dimensions: variant.dimensions ?? null,
        status: variant.status ?? "active",
      })),
    });
  } else {
    // Legacy: Create variants from format flags with per-format pricing
    const legacyVariants: Array<{ format: string; price: number }> = [];
    
    if (opts.input.paper_back) {
      const price = opts.input.paperback_price ?? opts.input.price ?? 0;
      if (price > 0) {
        legacyVariants.push({
          format: "paperback",
          price: price,
        });
      }
    }
    if (opts.input.hard_cover) {
      const price = opts.input.hardcover_price ?? opts.input.price ?? 0;
      if (price > 0) {
        legacyVariants.push({
          format: "hardcover",
          price: price,
        });
      }
    }
    if (opts.input.e_copy) {
      const price = opts.input.ebook_price ?? opts.input.price ?? 0;
      if (price > 0) {
        legacyVariants.push({
          format: "ebook",
          price: price,
        });
      }
    }

    if (legacyVariants.length > 0) {
      await (prisma as any).bookVariant.createMany({
        data: legacyVariants.map((variant) => ({
          book_id: createdBook.id,
          format: variant.format,
          language: opts.input.default_language ?? "en",
          list_price: variant.price,
          currency: "USD",
          stock_quantity: 0,
          status: "active",
        })),
      });
    } else {
      throw new Error("At least one variant with a valid price is required");
    }
  }

  return createdBook;
});

export const updateBook = publicProcedure.input(createBookSchema).mutation(async (opts) => {
  if (!opts.input.id) {
    throw new Error("Book ID is required for update");
  }

  // Validate that at least one book cover is provided (legacy support)
  const covers = [
    opts.input.book_cover,
    opts.input.book_cover2,
    opts.input.book_cover3,
    opts.input.book_cover4,
    opts.input.cover_image_url,
  ];
  
  const hasAtLeastOneCover = covers.some(
    (cover) => cover && typeof cover === "string" && cover.trim() !== ""
  );

  if (!hasAtLeastOneCover) {
    throw new Error("At least one book cover image is required");
  }

  const tagArray = opts.input.tags
    ? opts.input.tags.split("*").map(tag => tag.trim())
    : opts.input.subject_tags || [];

  // Update the book
  // Note: Type assertions needed until Prisma client is regenerated after migration
  const updatedBook = await prisma.book.update({
    where: { id: opts.input.id },
    data: {
      title: opts.input.title,
      subtitle: (opts.input.subtitle ?? undefined) as any,
      slug: opts.input.slug ?? undefined,
      description: opts.input.description ?? opts.input.short_description ?? undefined,
      synopsis: opts.input.synopsis ?? opts.input.long_description ?? undefined,
      cover_image_url: opts.input.cover_image_url ?? opts.input.book_cover ?? undefined,
      genre: opts.input.genre ?? undefined,
      subject_tags: tagArray,
      edition: opts.input.edition ?? undefined,
      publication_date: opts.input.publication_date ?? undefined,
      default_language: opts.input.default_language ?? undefined,
      page_count: opts.input.page_count ?? undefined,
      reading_age_min: opts.input.reading_age_min ?? undefined,
      reading_age_max: opts.input.reading_age_max ?? undefined,
      status: opts.input.status ?? undefined,
      // Legacy fields
      short_description: opts.input.short_description ?? undefined,
      long_description: opts.input.long_description ?? undefined,
      price: opts.input.price ?? undefined,
      tags: tagArray,
      paper_back: opts.input.paper_back ?? undefined,
      e_copy: opts.input.e_copy ?? undefined,
      hard_cover: opts.input.hard_cover ?? undefined,
      published: opts.input.published ?? undefined,
      pdf_url: opts.input.pdf_url ?? undefined,
      text_url: opts.input.text_url ?? undefined,
      book_cover: opts.input.book_cover ?? undefined,
      book_cover2: opts.input.book_cover2 ?? undefined,
      book_cover3: opts.input.book_cover3 ?? undefined,
      book_cover4: opts.input.book_cover4 ?? undefined,
      featured: opts.input.featured ?? undefined,
      author: opts.input.author_id ? {
        connect: {
          id: opts.input.author_id,
        },
      } : undefined,
      primary_author: opts.input.primary_author_id ? {
        connect: {
          id: opts.input.primary_author_id,
        },
      } : undefined,
    },
  });

  // Update variants if provided
  if (opts.input.variants && opts.input.variants.length > 0) {
    // Delete existing variants and create new ones (or update if id is provided)
    const variantsToCreate = opts.input.variants.filter(v => !v.id);
    const variantsToUpdate = opts.input.variants.filter(v => v.id);

    // Update existing variants
    for (const variant of variantsToUpdate) {
      await (prisma as any).bookVariant.update({
        where: { id: variant.id! },
        data: {
          format: variant.format,
          isbn13: variant.isbn13 ?? undefined,
          language: variant.language ?? undefined,
          list_price: variant.list_price,
          currency: variant.currency ?? undefined,
          discount_price: variant.discount_price ?? undefined,
          stock_quantity: variant.stock_quantity ?? undefined,
          sku: variant.sku ?? undefined,
          digital_asset_url: variant.digital_asset_url ?? undefined,
          weight_grams: variant.weight_grams ?? undefined,
          dimensions: variant.dimensions ?? undefined,
          status: variant.status ?? undefined,
        },
      });
    }

    // Create new variants
    if (variantsToCreate.length > 0) {
      await (prisma as any).bookVariant.createMany({
        data: variantsToCreate.map((variant) => ({
          book_id: updatedBook.id,
          format: variant.format,
          isbn13: variant.isbn13 ?? null,
          language: variant.language ?? "en",
          list_price: variant.list_price,
          currency: variant.currency ?? "USD",
          discount_price: variant.discount_price ?? null,
          stock_quantity: variant.stock_quantity ?? 0,
          sku: variant.sku ?? null,
          digital_asset_url: variant.digital_asset_url ?? null,
          weight_grams: variant.weight_grams ?? null,
          dimensions: variant.dimensions ?? null,
          status: variant.status ?? "active",
        })),
      });
    }
  }

  return updatedBook;
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
    include: { 
      author: true, 
      chapters: true,
      variants: true, // Include variants for editing with prices
    }
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

export const getPurchasedBooksByCustomer = publicProcedure.input(findBookByIdSchema).query(async (opts) => {
  // Find the customer by user_id
  const customer = await prisma.customer.findUnique({
    where: { user_id: opts.input.id },
  });

  if (!customer) {
    return [];
  }

  // Get all orders for this customer that have been paid (payment_status = "captured")
  const paidOrders = await prisma.order.findMany({
    where: {
      customer_id: customer.id,
      payment_status: "captured", // Only get books from paid orders
    },
    include: {
      line_items: {
        include: {
          book_variant: {
            include: {
              book: {
                include: {
                  author: true,
                  chapters: true,
                  variants: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Extract unique books from order line items
  const bookMap = new Map<string, any>();
  
  paidOrders.forEach((order) => {
    order.line_items.forEach((lineItem) => {
      const book = lineItem.book_variant.book;
      if (book && !book.deleted_at) {
        // Use book ID as key to ensure uniqueness
        if (!bookMap.has(book.id)) {
          bookMap.set(book.id, book);
        }
      }
    });
  });

  return Array.from(bookMap.values());
});
