import prisma from "@/lib/prisma";
import { authorAccountSetupSchema, createAuthorSchema, deleteAuthorSchema, findBookByIdSchema, inviteAuthorSchema, resendAuthorInviteSchema, signUpAuthorSchema, updateAuthorSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { PERMISSIONS } from "@/lib/constants";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { resolveUserContext } from "@/lib/is-super-admin";
import { consumeVerificationToken, createVerificationToken, validateVerificationToken, wasTokenRecentlySent } from "@/lib/tokens";
import { sendAuthorInviteEmail } from "@/lib/email";
import crypto from "crypto";

/**
 * Author Module
 * * Phase C: Added getAuthorDashboardStats for Author Dashboard.
 * * Maintains existing bcrypt signup and multi-publisher author management.
 */

function makePlaceholderEmail() {
  return `author-${crypto.randomUUID()}@placeholder.iwacumo.local`;
}

function makePlaceholderPassword() {
  return crypto.randomBytes(24).toString("hex");
}

function deriveAuthorDisplayName(input: {
  first_name?: string | null;
  last_name?: string | null;
  pen_name?: string | null;
}) {
  return input.pen_name?.trim() || `${input.first_name ?? ""} ${input.last_name ?? ""}`.trim() || "Author";
}

async function sendAuthorInvite(authorId: string, email: string, inviterName: string, publisherName: string) {
  const author = await prisma.author.findUnique({
    where: { id: authorId },
    include: { user: true },
  });

  if (!author?.user_id) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Author account not found." });
  }

  const token = await createVerificationToken(author.user_id, "AUTHOR_INVITE");
  await sendAuthorInviteEmail({
    to: email,
    inviterName,
    publisherName,
    token,
  });

  return prisma.author.update({
    where: { id: authorId },
    data: {
      invite_email: email,
      onboarding_status: "invited",
      invite_sent_at: new Date(),
    },
  });
}

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

  const creator = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { publisher: { include: { tenant: true } }, claims: { include: { permission: true } } }
  });
  if (!creator?.publisher) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Only publishers can add authors." });
  }

  const isWhiteLabel = !!creator.publisher.white_label;
  const email = isWhiteLabel ? opts.input.email?.trim() : opts.input.email?.trim() || undefined;

  if (isWhiteLabel && !email) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Email is required to invite a white-label author." });
  }

  if (email) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new TRPCError({ code: "CONFLICT", message: "A user with this email already exists." });
    }
  }

  const user = await prisma.user.create({
    data: {
      username: opts.input.username || null,
      email: email || makePlaceholderEmail(),
      password: bcrypt.hashSync(opts.input.password || makePlaceholderPassword(), 10),
      phone_number: opts.input.phone_number ?? "",
      first_name: opts.input.first_name ?? "",
      last_name: opts.input.last_name ?? "",
      active: false,
    }
  });

  const slug = creator?.claims.find((claim) => claim.permission?.name === PERMISSIONS.PUBLISHER)?.tenant_slug;
  const authorPermission = await prisma.permission.findFirst({ where: { name: PERMISSIONS.AUTHOR } });

  await prisma.claim.create({
    data: { user_id: user.id, permission_id: authorPermission?.id, type: "PERMISSION", active: true, tenant_slug: slug }
  });

  const author = await prisma.author.create({
    data: {
      user_id: user.id,
      publisher_id: creator?.publisher?.id,
      name: deriveAuthorDisplayName(opts.input),
      pen_name: opts.input.pen_name?.trim() || null,
      invite_email: email || null,
      onboarding_status: isWhiteLabel ? "invited" : "roster_only",
      invite_sent_at: isWhiteLabel ? new Date() : null,
    },
  });

  if (isWhiteLabel && email) {
    const inviterName = [creator.first_name, creator.last_name].filter(Boolean).join(" ") || "The iwacumo team";
    const publisherName = creator.publisher.tenant?.name ?? "your publisher";
    await sendAuthorInvite(author.id, email, inviterName, publisherName);
  }

  return {
    author,
    onboarding_mode: isWhiteLabel ? "invite" : "roster_only",
  };
});

export const updateAuthor = publicProcedure
  .input(updateAuthorSchema) // Uses the new DTO we discussed
  .mutation(async ({ input }) => {
    const { id, first_name, last_name, pen_name, username, phone_number } = input;

    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: {
            author: { id }
          }
        }
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This username is already taken by another user."
        });
      }
    }

    return await prisma.author.update({
      where: { id },
      data: {
        name: deriveAuthorDisplayName({ first_name, last_name, pen_name }),
        pen_name: pen_name?.trim() || null,
        user: {
          update: {
            first_name,
            last_name,
            ...(username ? { username } : {}),
            phone_number: phone_number ?? ""
          }
        }
      },
      include: {
        user: true
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
      active: true,
      email_verified_at: new Date(),
    }
  });

  const tenant = await prisma.tenant.findFirst({ where: { slug: "booka" }, include: { publishers: true } });
  if(!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "Default tenant not found" });

  const publisher = await prisma.author.create({
    data: {
      user_id: user.id,
      publisher_id: (tenant.publishers as any)?.id,
      slug: opts.input.slug,
      pen_name: opts.input.pen_name?.trim() || null,
      name: deriveAuthorDisplayName(opts.input),
      onboarding_status: "active",
      onboarding_completed_at: new Date(),
    },
  });

  const authorPermission = await prisma.permission.findFirstOrThrow({ where: { name: PERMISSIONS.AUTHOR } });
  await prisma.claim.create({
    data: { user_id: user.id, permission_id: authorPermission.id, tenant_slug: tenant.slug, type: "PERMISSION", active: true }
  });

  return publisher;
});

export const getAllAuthors = publicProcedure.query(async () => {
  return await prisma.author.findMany({
    where: { deleted_at: null },
    include: {
      user: true,
      publisher: {
        include: {
          tenant: true,
        },
      },
    },
  });
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
        include: {
          books: { where: { deleted_at: null } },
          user: true,
          publisher: {
            include: {
              tenant: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
      });
    }
 
    if (ctx.publisher_id) {
      return await prisma.author.findMany({
        where:   { publisher_id: ctx.publisher_id, deleted_at: null },
        include: {
          books: true,
          user: true,
          publisher: {
            include: {
              tenant: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
      });
    }
 
    if (ctx.author_id) {
      return await prisma.author.findMany({
        where:   { id: ctx.author_id, deleted_at: null },
        include: {
          books: true,
          user: true,
          publisher: {
            include: {
              tenant: true,
            },
          },
        },
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

export const inviteAuthor = publicProcedure
  .input(inviteAuthorSchema)
  .mutation(async ({ input }) => {
    const session = await auth();
    if (!session?.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

    const inviter = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { publisher: { include: { tenant: true } } },
    });

    if (!inviter?.publisher?.white_label) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Only white-label publishers can invite authors." });
    }

    const author = await prisma.author.findUnique({
      where: { id: input.author_id },
      include: { user: true, publisher: { include: { tenant: true } } },
    });

    if (!author || author.publisher_id !== inviter.publisher.id) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Author not found in your roster." });
    }

    if (author.user?.active && author.onboarding_status === "active") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "This author has already completed onboarding." });
    }

    const email = input.email.trim();
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: author.user_id },
      },
    });
    if (existingUser) {
      throw new TRPCError({ code: "CONFLICT", message: "Another user already uses this email." });
    }

    await prisma.user.update({
      where: { id: author.user_id },
      data: {
        email,
        active: false,
      },
    });

    const inviterName = [inviter.first_name, inviter.last_name].filter(Boolean).join(" ") || "The iwacumo team";
    const publisherName = inviter.publisher.tenant?.name ?? "your publisher";
    await sendAuthorInvite(author.id, email, inviterName, publisherName);

    return { success: true };
  });

export const resendAuthorInvite = publicProcedure
  .input(resendAuthorInviteSchema)
  .mutation(async ({ input }) => {
    const inviter = await prisma.user.findUnique({
      where: { id: input.inviter_user_id },
      include: { publisher: { include: { tenant: true } } },
    });
    if (!inviter?.publisher?.white_label) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Only white-label publishers can resend author invites." });
    }

    const author = await prisma.author.findUnique({
      where: { id: input.author_id },
      include: { user: true },
    });
    if (!author || author.publisher_id !== inviter.publisher.id) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Author not found in your roster." });
    }

    if (author.user?.active && author.onboarding_status === "active") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "This author has already completed onboarding." });
    }

    const email = input.email?.trim() || author.invite_email || author.user?.email;
    if (!email || email.endsWith("@placeholder.iwacumo.local")) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Add a valid email before sending an invite." });
    }

    const tooSoon = await wasTokenRecentlySent(author.user_id, "AUTHOR_INVITE", 60);
    if (tooSoon) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please wait before sending another invite." });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: author.user_id },
      },
    });
    if (existingUser) {
      throw new TRPCError({ code: "CONFLICT", message: "Another user already uses this email." });
    }

    await prisma.user.update({
      where: { id: author.user_id },
      data: { email, active: false },
    });

    const inviterName = [inviter.first_name, inviter.last_name].filter(Boolean).join(" ") || "The iwacumo team";
    const publisherName = inviter.publisher.tenant?.name ?? "your publisher";
    await sendAuthorInvite(author.id, email, inviterName, publisherName);

    return { success: true };
  });

export const setupAuthorAccount = publicProcedure
  .input(authorAccountSetupSchema)
  .mutation(async ({ input }) => {
    let userId: string;
    try {
      userId = await validateVerificationToken(input.token, "AUTHOR_INVITE");
    } catch (err: any) {
      const msg =
        err.message === "TOKEN_EXPIRED"
          ? "This invite link has expired. Ask your publisher to resend it."
          : err.message === "TOKEN_USED"
          ? "This invite link has already been used."
          : "Invalid invite link.";
      throw new TRPCError({ code: "BAD_REQUEST", message: msg });
    }

    const author = await prisma.author.findUnique({
      where: { user_id: userId },
      include: { user: true },
    });
    if (!author?.user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Author account not found." });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          first_name: input.first_name,
          last_name: input.last_name,
          password: bcrypt.hashSync(input.password, 10),
          active: true,
          email_verified_at: new Date(),
        },
      });

      await tx.author.update({
        where: { id: author.id },
        data: {
          pen_name: input.pen_name?.trim() || null,
          name: deriveAuthorDisplayName(input),
          onboarding_status: "active",
          onboarding_completed_at: new Date(),
        },
      });

      await consumeVerificationToken(input.token);
    });

    return { success: true };
  });
