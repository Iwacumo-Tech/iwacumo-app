import { auth } from "@/auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { createBookSchema, deleteBookSchema, findBookByIdSchema, toggleFeaturedSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import mammoth from "mammoth"; 
import axios from "axios"
import { watermarkPdf } from "@/lib/watermark";
import { put } from "@vercel/blob";

/**
 * Refactored Book Module
 * * FIX: Uses 'publisher: { connect: { id } }' instead of 'publisher_id' scalar to resolve Prisma validation errors.
 * * MAINTAINS ALL EXISTING LOGIC including:
 * - Legacy format flags (paper_back, e_copy, hard_cover)
 * - Multi-cover validation (book_cover 1-4)
 * - Complex procedures (getPurchasedBooksByCustomer, getBookByAuthor, etc.)
 */

export const createBook = publicProcedure.input(createBookSchema).mutation(async (opts) => {
  const session = await auth();

  if (!session) {
    console.error("User session not found");
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User session not found" });
  }

  // Fetch creator with full context for ID resolution
  const creator = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { publisher: true, author: true },
  });

  if (!creator) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Creator not found" });
  }

  // --- CONTEXT RESOLUTION ---
  // Resolve Publisher: Provided ID > Creator's Publisher ID > Creator's Author's Publisher ID
  // const publisherId = opts.input.publisher_id || creator.publisher?.id || creator.author?.publisher_id;
  
  // Resolve Author: Provided Primary > Provided Author > Creator's Author ID
  const primaryAuthorId = opts.input.primary_author_id || opts.input.author_id || creator.author?.id;

  let publisherId = opts.input.publisher_id || creator.publisher?.id || creator.author?.publisher_id;

  // if (!publisherId) {
  //   throw new TRPCError({ code: "BAD_REQUEST", message: "Could not resolve Publisher context" });
  // }

  if (!publisherId) {
    const platformPublisher = await prisma.publisher.findUnique({
      where: { slug: "booka" }
    });
    publisherId = platformPublisher?.id;
  }

  if (!publisherId) {
    throw new TRPCError({ 
      code: "BAD_REQUEST", 
      message: "Could not resolve Publisher context. Please contact support." 
    });
  }

  if (!primaryAuthorId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Author is required" });
  }

  // Validate if the resolved author exists
  const authorExists = await prisma.author.findUnique({
    where: { id: primaryAuthorId },
  });
  if (!authorExists) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Author not found" });
  }

  // --- VALIDATION ---
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
    throw new TRPCError({ code: "BAD_REQUEST", message: "At least one book cover image is required" });
  }

  const hasVariants = opts.input.variants && opts.input.variants.length > 0;
  const hasLegacyFormats = opts.input.paper_back || opts.input.e_copy || opts.input.hard_cover;
  
  if (!hasVariants && !hasLegacyFormats) {
    throw new TRPCError({ 
      code: "BAD_REQUEST", 
      message: "At least one book variant is required. Please select a format or provide variant details." 
    });
  }

  let autoChapters: any[] = [];
  if (opts.input.docx_url) {
    try {
      const response = await axios.get(opts.input.docx_url, { responseType: 'arraybuffer' });
      const result = await mammoth.convertToHtml({ buffer: Buffer.from(response.data) });
      const fullHtml = result.value;

      // Split by <h1> or <h2> tags for automatic chapter generation
      const sections = fullHtml.split(/(?=<h[1-2][^>]*>)/i).filter(Boolean);

      if (sections.length > 0) {
        autoChapters = sections.map((section, index) => {
          const titleMatch = section.match(/<h[1-2][^>]*>(.*?)<\/h[1-2]>/i);
          const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : `Chapter ${index + 1}`;
          return {
            title,
            content: section,
            chapter_number: index + 1,
            word_count: section.replace(/<[^>]+>/g, '').split(/\s+/).length,
          };
        });
      } else {
        autoChapters = [{
          title: "Full Content",
          content: fullHtml,
          chapter_number: 1,
          word_count: fullHtml.replace(/<[^>]+>/g, '').split(/\s+/).length,
        }];
      }
    } catch (error) {
      console.error("Failed to parse DOCX outside transaction:", error);
      // Decide if you want to fail the whole process or just skip chapters
    }
  }

  const tagArray = opts.input.tags
    ? opts.input.tags.split("*").map(tag => tag.trim())
    : opts.input.subject_tags || [];

  // --- DATABASE TRANSACTION ---
  return await prisma.$transaction(async (tx) => {
    // 1. Create the book using 'connect' for all relations
    const createdBook = await tx.book.create({
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
        short_description: opts.input.short_description ?? null,
        long_description: opts.input.long_description ?? null,
        price: opts.input.price ?? 0,
        tags: tagArray,
        paper_back: opts.input.paper_back ?? false,
        e_copy: opts.input.e_copy ?? false,
        hard_cover: opts.input.hard_cover ?? false,
        published: opts.input.published ?? false,
        
        book_cover: opts.input.book_cover ?? null,
        book_cover2: opts.input.book_cover2 ?? null,
        book_cover3: opts.input.book_cover3 ?? null,
        book_cover4: opts.input.book_cover4 ?? null,
        featured: opts.input.featured ?? false,
        pdf_url: opts.input.pdf_url ?? "",
        text_url: opts.input.docx_url ?? opts.input.text_url ?? "",
        // Relation connections
        categories: {
          connect: opts.input.category_ids?.map(id => ({ id })) || []
        },

        publisher: {
          connect: { id: publisherId },
        },
        author: {
          connect: { id: primaryAuthorId },
        },
        primary_author: {
          connect: { id: primaryAuthorId },
        },
      },
    });

    if (autoChapters.length > 0) {
      await tx.chapter.createMany({
        data: autoChapters.map(ch => ({
          ...ch,
          book_id: createdBook.id,
        })),
      });
    }

    // 2. Handle Variants: Priority to 'variants' array, fallback to legacy flags
    if (hasVariants) {
      await (tx as any).bookVariant.createMany({
        data: opts.input.variants!.map((variant) => ({
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
      const legacyVariants: Array<{ format: string; price: number }> = [];
      if (opts.input.paper_back) {
        legacyVariants.push({ format: "paperback", price: opts.input.paperback_price ?? opts.input.price ?? 0 });
      }
      if (opts.input.hard_cover) {
        legacyVariants.push({ format: "hardcover", price: opts.input.hardcover_price ?? opts.input.price ?? 0 });
      }
      if (opts.input.e_copy) {
        legacyVariants.push({ format: "ebook", price: opts.input.ebook_price ?? opts.input.price ?? 0 });
      }

      if (legacyVariants.length > 0) {
        await (tx as any).bookVariant.createMany({
          data: legacyVariants.map((v) => ({
            book_id: createdBook.id,
            format: v.format,
            language: opts.input.default_language ?? "en",
            list_price: v.price,
            currency: "USD",
            stock_quantity: 0,
            status: "active",
          })),
        });
      }
    }

    return createdBook;
  }, {
      // Optional: Explicitly increase timeout to 20 seconds as a safety measure
      timeout: 20000 
    });
  });

export const updateBook = publicProcedure.input(createBookSchema).mutation(async (opts) => {
  if (!opts.input.id) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Book ID is required for update" });
  }

  const covers = [
    opts.input.book_cover,
    opts.input.book_cover2,
    opts.input.book_cover3,
    opts.input.book_cover4,
    opts.input.cover_image_url,
  ];
  
  if (!covers.some((c) => c && typeof c === "string" && c.trim() !== "")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "At least one book cover image is required" });
  }

  const tagArray = opts.input.tags
    ? opts.input.tags.split("*").map(tag => tag.trim())
    : opts.input.subject_tags || [];

  return await prisma.$transaction(async (tx) => {
    const updatedBook = await tx.book.update({
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
        categories: {
          // 'set' replaces all existing categories with the new selection
          set: opts.input.category_ids?.map(id => ({ id })) || []
        },
        publisher: opts.input.publisher_id ? { connect: { id: opts.input.publisher_id } } : undefined,
        author: opts.input.author_id ? { connect: { id: opts.input.author_id } } : undefined,
        primary_author: opts.input.primary_author_id ? { connect: { id: opts.input.primary_author_id } } : undefined,
      },
    });

    // Handle Variants: Priority to 'variants' array, fallback to legacy flags
    if (opts.input.variants && opts.input.variants.length > 0) {
      const variantsToCreate = opts.input.variants.filter(v => !v.id);
      const variantsToUpdate = opts.input.variants.filter(v => v.id);

      for (const variant of variantsToUpdate) {
        await (tx as any).bookVariant.update({
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

      if (variantsToCreate.length > 0) {
        await (tx as any).bookVariant.createMany({
          data: variantsToCreate.map((v) => ({
            book_id: updatedBook.id,
            format: v.format,
            isbn13: v.isbn13 ?? null,
            language: v.language ?? "en",
            list_price: v.list_price,
            currency: v.currency ?? "USD",
            discount_price: v.discount_price ?? null,
            stock_quantity: v.stock_quantity ?? 0,
            sku: v.sku ?? null,
            digital_asset_url: v.digital_asset_url ?? null,
            weight_grams: v.weight_grams ?? null,
            dimensions: v.dimensions ?? null,
            status: v.status ?? "active",
          })),
        });
      }
    } else {
      // Fallback: Sync variants based on legacy boolean flags and prices
      const legacyFormats = [
        { key: 'paper_back', format: 'paperback', price: opts.input.paperback_price },
        { key: 'hard_cover', format: 'hardcover', price: opts.input.hardcover_price },
        { key: 'e_copy', format: 'ebook', price: opts.input.ebook_price },
      ] as const;

      for (const { key, format, price } of legacyFormats) {
        if (opts.input[key]) {
          // If format is checked: Update price or create variant
          const listPrice = (price || opts.input.price || 0);
          const existing = await (tx as any).bookVariant.findFirst({
            where: { book_id: updatedBook.id, format }
          });

          if (existing) {
            await (tx as any).bookVariant.update({
              where: { id: existing.id },
              data: { list_price: listPrice }
            });
          } else {
            await (tx as any).bookVariant.create({
              data: {
                book_id: updatedBook.id,
                format,
                list_price: listPrice,
                language: opts.input.default_language ?? "en",
                currency: "USD",
                status: "active",
              }
            });
          }
        } else {
          // REMOVE: If the format is unchecked, delete the variant record entirely
          await (tx as any).bookVariant.deleteMany({
            where: { book_id: updatedBook.id, format }
          });
        }
      }
    }

    return updatedBook;
  });
});

export const deleteBook = publicProcedure.input(deleteBookSchema).mutation(async (opts) => {
  return await prisma.book.update({
    where: { id: opts.input.id },
    data: { deleted_at: new Date() },
  });
});

export const getAllBooks = publicProcedure.query(async ({ ctx }) => {
  // 1. Resolve User/Claims to check for Super Admin status
  const user = await prisma.user.findUnique({
    where: { id: ctx.session?.user?.id },
    include: { claims: true }
  });

  const isSuperAdmin = user?.claims.some(c => c.role_name === "super-admin" && c.active);

  // 2. Fetch Books
  const books = await prisma.book.findMany({
    where: { 
      deleted_at: null,
      // Logic: Super Admin sees everything. 
      // Publishers/Authors only see their own (if you want to apply that here)
      // For now, making it GLOBAL for management
    },
    include: {
      chapters: true,
      author: true,
      publisher: true,
      categories: true,
      variants: {
        include: {
          _count: {
            select: { 
              order_lineitems: { 
                where: { order: { payment_status: "captured" } } 
              } 
            }
          }
        }
      }
    },
    orderBy: { created_at: "desc" }
  });

  // 3. Robust Mapping for salesCount
  return books.map(book => {
    const totalSales = book.variants?.reduce((acc, variant) => {
      // Accessing the specific count path from the Prisma include
      const count = variant._count?.order_lineitems || 0;
      return acc + count;
    }, 0) || 0;

    return {
      ...book,
      salesCount: totalSales
    };
  });
});


export const getBookById = publicProcedure.input(findBookByIdSchema).query(async (opts) => {
  return await prisma.book.findUnique({
    where: { id: opts.input.id, deleted_at: null },
    include: { author: true, chapters: true, variants: true, publisher: true, categories: true }
  });
});

export const getCategories = publicProcedure.query(async () => {
  try {
    return await prisma.category.findMany({
      orderBy: {
        name: 'asc'
      }
    });
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch categories",
    });
  }
});

export const getBookByAuthor = publicProcedure.input(findBookByIdSchema).query(async (opts) => {
  const user = await prisma.user.findUnique({
    where: { id: opts.input.id },
    include: { author: true, publisher: true }
  });

  const baseInclude = { 
    chapters: true, 
    author: true, 
    categories: true,
    variants: {
      include: {
        _count: {
          select: { order_lineitems: true }
        },
        order_lineitems: {
          where: { order: { payment_status: "captured" } }
        }
      }
    }
  };

  if (user?.publisher) {
    return await prisma.book.findMany({
      where: { publisher_id: user.publisher.id, deleted_at: null },
      include: baseInclude
    });
  }

  if (user?.author) {
    return await prisma.book.findMany({
      where: { author_id: user.author.id, deleted_at: null },
      include: baseInclude
    });
  }
  return [];
});

export const toggleBookFeatured = publicProcedure.input(toggleFeaturedSchema).mutation(async ({ input }) => {
  const book = await prisma.book.findUnique({ where: { id: input.id } });
  if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });

  return await prisma.book.update({
    where: { id: input.id },
    data: { featured: !book.featured },
  });
});

export const getAllFeaturedBooks = publicProcedure.query(async () => {
  return await prisma.book.findMany({
    where: { featured: true, deleted_at: null },
    include: { chapters: true, author: true, variants: true },
  });
});

export const getNewArrivalBooks = publicProcedure.query(async () => {
  return await prisma.book.findMany({
    where: { deleted_at: null },
    orderBy: { created_at: "desc" },
    include: { chapters: true, author: true, variants: true },
    take: 12,
  });
});

export const getPurchasedBooksByCustomer = publicProcedure.input(findBookByIdSchema).query(async (opts) => {
  const customer = await prisma.customer.findFirst({
    where: { user_id: opts.input.id },
  });

  if (!customer) return [];

  const paidOrders = await prisma.order.findMany({
    where: {
      customer_id: customer.id,
      payment_status: "captured",
    },
    include: {
      line_items: {
        include: {
          book_variant: {
            include: {
              book: {
                include: { author: true, chapters: true, variants: true },
              },
            },
          },
        },
      },
    },
  });

  const bookMap = new Map<string, any>();
  paidOrders.forEach((order) => {
    order.line_items.forEach((lineItem) => {
      const book = lineItem.book_variant.book;
      if (book && !book.deleted_at && !bookMap.has(book.id)) {
        bookMap.set(book.id, book);
      }
    });
  });

  return Array.from(bookMap.values());
});


export const generateWatermarkedEbook = publicProcedure
  .input(
    z.object({
      bookId: z.string(),
      // Removed orderId and variantId to match your frontend call
    })
  )
  .mutation(async ({ input, ctx }) => {
    // ctx.session is now available because of Step 1
    const session = ctx.session;

    if (!session?.user?.email) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to download.",
      });
    }

    const book = await prisma.book.findUnique({
      where: { id: input.bookId },
    });

    if (!book || !book.pdf_url) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Book asset not found.",
      });
    }

    try {
      // 1. Download original from Vercel Blob
      const response = await axios.get(book.pdf_url, {
        responseType: "arraybuffer",
      });

      // 2. Process with pdf-lib (Watermarking)
      const securedPdf = await watermarkPdf(
        Buffer.from(response.data),
        session.user.email
      );

      // 3. Upload temporary secure copy
      const tempName = `temp/secure-${Date.now()}-${input.bookId}.pdf`;
      const { url } = await put(tempName, Buffer.from(securedPdf), { 
        access: "public",
        contentType: "application/pdf",
      });

      return { url };
    } catch (error) {
      console.error("Watermarking Error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Watermarking failed. Please try again.",
      });
    }
  });