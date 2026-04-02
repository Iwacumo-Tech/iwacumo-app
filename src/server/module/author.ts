import prisma from "@/lib/prisma";
import { createAuthorSchema, updateAuthorSchema, deleteAuthorSchema, findBookByIdSchema, signUpAuthorSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { PERMISSIONS } from "@/lib/constants";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { resolveUserContext } from "@/lib/is-super-admin";

/**
 * Author Module
 * * Phase C: Added getAuthorDashboardStats for Author Dashboard.
 * * Maintains existing bcrypt signup and multi-publisher author management.
 */

// --- Dashboard Analytics ---
export const getAuthorDashboardStats = publicProcedure
  .input(z.object({ author_id: z.string() }))
  .query(async ({ input }) => {
    const [bookCount, salesData] = await Promise.all([
      prisma.book.count({ where: { author_id: input.author_id, deleted_at: null } }),
      prisma.orderLineItem.aggregate({
        where: {
          book_variant: { book: { author_id: input.author_id } },
          order: { payment_status: "captured" }
        },
        _sum: { author_earnings: true, total_price: true }
      })
    ]); 

    const recentReviews = await prisma.review.findMany({
      where: { book: { author_id: input.author_id } },
      take: 5,
      orderBy: { created_at: 'desc' },
      include: { book: { select: { title: true } } }
    });

    return {
      totalBooks: bookCount,
      totalEarnings: salesData._sum.author_earnings || 0,
      totalRevenueGenerated: salesData._sum.total_price || 0,
      recentReviews
    };
  });

// --- Existing Author Management Logic ---
export const createAuthor = publicProcedure.input(createAuthorSchema).mutation(async (opts) => {
  const session = await auth();
  if(!session) throw new TRPCError({ code: "UNAUTHORIZED" });

  const user = await prisma.user.create({
    data: {
      username: opts.input.username,
      email: opts.input.email ?? "",
      password: bcrypt.hashSync(opts.input.password!, 10),
      phone_number: opts.input.phone_number ?? "",
      first_name: opts.input.first_name ?? "",
      last_name: opts.input.last_name ?? "",
    }
  });

  const creator = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { publisher: true, claims: { include: { permission: true } } }
  });

  const slug = creator?.claims.find((claim) => claim.permission?.name === PERMISSIONS.PUBLISHER)?.tenant_slug;
  const authorPermission = await prisma.permission.findFirst({ where: { name: PERMISSIONS.AUTHOR } });

  await prisma.claim.create({
    data: { user_id: user.id, permission_id: authorPermission?.id, type: "PERMISSION", active: true, tenant_slug: slug }
  });

  return await prisma.author.create({
    data: { user_id: user.id, publisher_id: creator?.publisher?.id, name: user.first_name },
  });
});

export const updateAuthor = publicProcedure
  .input(updateAuthorSchema) // Uses the new DTO we discussed
  .mutation(async ({ input }) => {
    const { id, first_name, last_name, username, phone_number } = input;

    // 1. Check if the new username is already taken by someone else
    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        NOT: {
          author: { id } // Exclude the current author from the check
        }
      }
    });

    if (existingUser) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This username is already taken by another user."
      });
    }

    // 2. Perform the update
    return await prisma.author.update({
      where: { id },
      data: {
        // Update the 'name' field on the Author record for quick display
        name: `${first_name} ${last_name}`.trim(),
        
        // Reach into the User table to update the core account details
        user: {
          update: {
            first_name,
            last_name,
            username,
            phone_number: phone_number ?? ""
          }
        }
      },
      include: {
        user: true // Return the updated user object to sync the frontend
      }
    });
  });

export const signUpAuthor = publicProcedure.input(signUpAuthorSchema).mutation(async (opts) => {
  const user = await prisma.user.create({
    data: {
      email: opts.input.email ?? "",
      password: bcrypt.hashSync(opts.input.password!, 10),
      phone_number: opts.input.phone_number ?? "",
      first_name: opts.input.first_name ?? "",
      last_name: opts.input.last_name ?? "",
    }
  });

  const tenant = await prisma.tenant.findFirst({ where: { slug: "booka" }, include: { publishers: true } });
  if(!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "Default tenant not found" });

  const publisher = await prisma.author.create({
    data: { user_id: user.id, publisher_id: (tenant.publishers as any)?.id, slug: opts.input.slug },
  });

  const authorPermission = await prisma.permission.findFirstOrThrow({ where: { name: PERMISSIONS.AUTHOR } });
  await prisma.claim.create({
    data: { user_id: user.id, permission_id: authorPermission.id, tenant_slug: tenant.slug, type: "PERMISSION", active: true }
  });

  return publisher;
});

export const getAllAuthors = publicProcedure.query(async () => {
  return await prisma.author.findMany({ where: { deleted_at: null }, include: { user: true } });
});

// export const getAuthorsByUser = publicProcedure
//   .input(z.object({ id: z.string() }))
//   .query(async (opts) => {
//     // 1. Fetch user with their full context including claims
//     const user = await prisma.user.findUnique({ 
//       where: { id: opts.input.id }, 
//       include: { author: true, publisher: true, claims: true } 
//     });

//     if (!user) return [];

//     // 2. CHECK FOR SUPER-ADMIN ROLE
//     const isSuperAdmin = user.claims.some(c => c.role_name === "super-admin" && c.active);

//     if (isSuperAdmin) {
//       // God-mode: All authors, all books
//       return await prisma.author.findMany({
//         where: { deleted_at: null },
//         include: { books: { where: { deleted_at: null } }, user: true }
//       });
//     }

//     // --- STANDARD ROLE-BASED FILTERS ---
//     if (user.publisher) {
//       return await prisma.author.findMany({ 
//         where: { publisher_id: user.publisher.id, deleted_at: null }, 
//         include: { books: true, user: true } 
//       });
//     }

//     if (user.author) {
//       return await prisma.author.findMany({ 
//         where: { id: user.author.id, deleted_at: null }, 
//         include: { books: true, user: true } 
//       });
//     }

//     return [];
//   });


export const getAuthorsByUser = publicProcedure
  .input(z.object({ id: z.string() }))
  .query(async (opts) => {
    const ctx = await resolveUserContext(opts.input.id);
    if (!ctx.isUser && !ctx.isAdminUser) return [];
 
    if (ctx.isSuperAdmin) {
      return await prisma.author.findMany({
        where:   { deleted_at: null },
        include: { books: { where: { deleted_at: null } }, user: true },
        orderBy: { created_at: "desc" },
      });
    }
 
    if (ctx.publisher_id) {
      return await prisma.author.findMany({
        where:   { publisher_id: ctx.publisher_id, deleted_at: null },
        include: { books: true, user: true },
        orderBy: { created_at: "desc" },
      });
    }
 
    if (ctx.author_id) {
      return await prisma.author.findMany({
        where:   { id: ctx.author_id, deleted_at: null },
        include: { books: true, user: true },
      });
    }
 
    return [];
  });
  
export const getAuthorBySlug = publicProcedure.input(findBookByIdSchema).query(async (opts) => {
  return await prisma.author.findUnique({ where: { slug: opts.input.id }, include: { user: true, publisher: true, books: true } });
});

export const deleteAuthor = publicProcedure.input(deleteAuthorSchema).mutation(async (opts) => {
  return await prisma.author.update({ where: { id: opts.input.id }, data: { deleted_at: new Date() } });
});