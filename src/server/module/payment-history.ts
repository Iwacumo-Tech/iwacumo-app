import prisma from "@/lib/prisma";
import { z } from "zod";
import { publicProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { resolveUserContext } from "@/lib/is-super-admin";
 
export const getPaymentHistorySchema = z.object({
  from_date:    z.string().optional(),
  to_date:      z.string().optional(),
  publisher_id: z.string().optional(),
  author_id:    z.string().optional(),
  page:         z.number().int().min(1).default(1),
  per_page:     z.number().int().min(1).max(100).default(20),
}).optional();
 
const BREAKDOWN_INCLUDE = {
  book_variant: {
    include: {
      book: {
        include: {
          author: {
            include: {
              user: { select: { first_name: true, last_name: true, email: true } },
            },
          },
          publisher: {
            include: {
              user:   { select: { first_name: true, last_name: true } },
              tenant: { select: { name: true } },
            },
          },
        },
      },
    },
  },
  order: {
    select: {
      id:             true,
      order_number:   true,
      created_at:     true,
      status:         true,
      payment_status: true,
      total_amount:   true,
      customer: {
        include: {
          user: { select: { first_name: true, last_name: true, email: true } },
        },
      },
    },
  },
} as const;
 
const EMPTY_RESULT = (page: number, perPage: number) => ({
  line_items:   [],
  summary:      { total_sales: 0, my_earnings: 0, platform_total: 0, pending_payout: 0 },
  by_book:      [],
  by_author:    [],
  by_publisher: [],
  pagination:   { page, per_page: perPage, total: 0, total_pages: 0 },
});
 
export const getPaymentHistory = publicProcedure
  .input(getPaymentHistorySchema)
  .query(async ({ ctx, input }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated." });
    }
 
    const userId  = ctx.session.user.id;
    const page    = input?.page    ?? 1;
    const perPage = input?.per_page ?? 20;
    const skip    = (page - 1) * perPage;
 
    // resolveUserContext handles both User and AdminUser IDs — no more NOT_FOUND
    const userCtx = await resolveUserContext(userId);
 
    if (!userCtx.isUser && !userCtx.isAdminUser) {
      return EMPTY_RESULT(page, perPage);
    }
 
    const isSuperAdmin = userCtx.isSuperAdmin;
    const isPublisher  = !!userCtx.publisher_id && !isSuperAdmin;
    const isAuthor     = !!userCtx.author_id;
 
    // ── Build where clause ────────────────────────────────────────────────
    const lineItemWhere: any = {
      order: { payment_status: "captured" },
    };
 
    if (input?.from_date || input?.to_date) {
      const dateFilter: any = {};
      if (input?.from_date) dateFilter.gte = new Date(input.from_date);
      if (input?.to_date)   dateFilter.lte = new Date(input.to_date);
      lineItemWhere.order = { ...lineItemWhere.order, created_at: dateFilter };
    }
 
    if (isSuperAdmin) {
      if (input?.publisher_id) {
        lineItemWhere.order = { ...lineItemWhere.order, publisher_id: input.publisher_id };
      }
      if (input?.author_id) {
        lineItemWhere.book_variant = { book: { author_id: input.author_id } };
      }
    } else if (isPublisher) {
      lineItemWhere.order = {
        ...lineItemWhere.order,
        publisher_id: userCtx.publisher_id,
      };
      if (input?.author_id) {
        lineItemWhere.book_variant = { book: { author_id: input.author_id } };
      }
    } else if (isAuthor) {
      lineItemWhere.book_variant = {
        book: { author_id: userCtx.author_id },
      };
    } else {
      return EMPTY_RESULT(page, perPage);
    }
 
    // ── Fetch in parallel ─────────────────────────────────────────────────
    const [lineItems, totalCount, allLineItems] = await Promise.all([
      prisma.orderLineItem.findMany({
        where:   lineItemWhere,
        include: BREAKDOWN_INCLUDE,
        orderBy: { order: { created_at: "desc" } },
        skip,
        take: perPage,
      }),
      prisma.orderLineItem.count({ where: lineItemWhere }),
      prisma.orderLineItem.findMany({
        where:   lineItemWhere,
        include: BREAKDOWN_INCLUDE,
        orderBy: { order: { created_at: "desc" } },
      }),
    ]);
 
    // ── Summary totals ────────────────────────────────────────────────────
    const totalSales        = allLineItems.reduce((a, c) => a + c.total_price,           0);
    const totalPlatformFees = allLineItems.reduce((a, c) => a + (c.platform_fee        ?? 0), 0);
    const totalPublisher    = allLineItems.reduce((a, c) => a + (c.publisher_earnings   ?? 0), 0);
    const totalAuthor       = allLineItems.reduce((a, c) => a + (c.author_earnings      ?? 0), 0);
 
    const myEarnings = isSuperAdmin ? totalPlatformFees
      : isPublisher  ? totalPublisher
      : totalAuthor;
 
    // ── Per-book breakdown ────────────────────────────────────────────────
    const bookMap = new Map<string, {
      book_id: string; title: string; cover: string | null;
      author_name: string; total_sales: number;
      publisher_earnings: number; author_earnings: number;
      platform_fee: number; units_sold: number;
    }>();
 
    for (const item of allLineItems) {
      const book = (item as any).book_variant?.book;
      if (!book) continue;
      const existing = bookMap.get(book.id);
      if (existing) {
        existing.total_sales        += item.total_price;
        existing.publisher_earnings += item.publisher_earnings ?? 0;
        existing.author_earnings    += item.author_earnings    ?? 0;
        existing.platform_fee       += item.platform_fee       ?? 0;
        existing.units_sold         += 1;
      } else {
        bookMap.set(book.id, {
          book_id:            book.id,
          title:              book.title,
          cover:              book.book_cover ?? book.cover_image_url ?? null,
          author_name:        book.author
            ? `${book.author.user?.first_name ?? ""} ${book.author.user?.last_name ?? ""}`.trim()
            : "Unknown",
          total_sales:        item.total_price,
          publisher_earnings: item.publisher_earnings ?? 0,
          author_earnings:    item.author_earnings    ?? 0,
          platform_fee:       item.platform_fee       ?? 0,
          units_sold:         1,
        });
      }
    }
    const byBook = Array.from(bookMap.values()).sort((a, b) => b.total_sales - a.total_sales);
 
    // ── Per-author breakdown ──────────────────────────────────────────────
    const authorMap = new Map<string, {
      author_id: string; name: string; email: string;
      total_sales: number; author_earnings: number; units_sold: number;
    }>();
 
    if (isSuperAdmin || isPublisher) {
      for (const item of allLineItems) {
        const author = (item as any).book_variant?.book?.author;
        if (!author) continue;
        const name  = `${author.user?.first_name ?? ""} ${author.user?.last_name ?? ""}`.trim();
        const email = author.user?.email ?? "";
        const existing = authorMap.get(author.id);
        if (existing) {
          existing.total_sales     += item.total_price;
          existing.author_earnings += item.author_earnings ?? 0;
          existing.units_sold      += 1;
        } else {
          authorMap.set(author.id, {
            author_id:       author.id,
            name,
            email,
            total_sales:     item.total_price,
            author_earnings: item.author_earnings ?? 0,
            units_sold:      1,
          });
        }
      }
    }
    const byAuthor = Array.from(authorMap.values()).sort((a, b) => b.total_sales - a.total_sales);
 
    // ── Per-publisher breakdown ───────────────────────────────────────────
    const publisherMap = new Map<string, {
      publisher_id: string; name: string;
      total_sales: number; publisher_earnings: number;
      platform_fee: number; units_sold: number;
    }>();
 
    if (isSuperAdmin) {
      for (const item of allLineItems) {
        const pub = (item as any).book_variant?.book?.publisher;
        if (!pub) continue;
        const name = pub.tenant?.name
          ?? `${pub.user?.first_name ?? ""} ${pub.user?.last_name ?? ""}`.trim()
          ?? "Unknown Publisher";
        const existing = publisherMap.get(pub.id);
        if (existing) {
          existing.total_sales        += item.total_price;
          existing.publisher_earnings += item.publisher_earnings ?? 0;
          existing.platform_fee       += item.platform_fee       ?? 0;
          existing.units_sold         += 1;
        } else {
          publisherMap.set(pub.id, {
            publisher_id:       pub.id,
            name,
            total_sales:        item.total_price,
            publisher_earnings: item.publisher_earnings ?? 0,
            platform_fee:       item.platform_fee       ?? 0,
            units_sold:         1,
          });
        }
      }
    }
    const byPublisher = Array.from(publisherMap.values()).sort((a, b) => b.total_sales - a.total_sales);
 
    // ── Serialise paginated items ─────────────────────────────────────────
    const serialisedItems = lineItems.map(item => {
      const bk   = (item as any).book_variant?.book;
      const auth = bk?.author;
      const cust = (item as any).order?.customer?.user;
      return {
        id:                 item.id,
        order_number:       (item as any).order.order_number,
        order_id:           (item as any).order.id,
        order_date:         (item as any).order.created_at.toISOString(),
        customer_name:      cust ? `${cust.first_name} ${cust.last_name ?? ""}`.trim() : "Guest",
        customer_email:     cust?.email ?? "",
        book_title:         bk?.title   ?? "Unknown",
        book_id:            bk?.id      ?? "",
        format:             item.book_variant.format,
        quantity:           item.quantity,
        unit_price:         item.unit_price,
        total_price:        item.total_price,
        platform_fee:       item.platform_fee,
        publisher_earnings: item.publisher_earnings,
        author_earnings:    item.author_earnings,
        author_name:        auth
          ? `${auth.user?.first_name ?? ""} ${auth.user?.last_name ?? ""}`.trim()
          : "",
      };
    });
 
    return {
      line_items:   serialisedItems,
      summary: {
        total_sales:    totalSales,
        my_earnings:    myEarnings,
        platform_total: totalPlatformFees,
        pending_payout: 0,
      },
      by_book:      byBook,
      by_author:    byAuthor,
      by_publisher: byPublisher,
      pagination: {
        page,
        per_page:    perPage,
        total:       totalCount,
        total_pages: Math.ceil(totalCount / perPage),
      },
    };
  });