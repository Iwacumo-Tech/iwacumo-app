import bcrypt from "bcryptjs";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { publicProcedure } from "@/server/trpc";
import { assignRoleSchema, createRoleSchema, createUserSchema, deleteUserSchema, editProfileSchema, permanentDeleteUserSchema, signUpSchema, toggleUserActiveSchema, updateProfileImageSchema, upgradeToAuthorSchema, upgradeToPublisherSchema } from "@/server/dtos";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";

async function sendUpgradeVerificationEmail(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.email || user.email_verified_at) return false;

  try {
    const token = await createVerificationToken(user.id, "EMAIL_VERIFY");
    await sendVerificationEmail({
      to: user.email,
      firstName: user.first_name,
      token,
    });
    return true;
  } catch (emailErr) {
    console.error("[upgrade] Failed to send verification email:", emailErr);
    return false;
  }
}



export const createUser = publicProcedure
  .input(createUserSchema)
  .mutation(async (opts) => {
    const {
      roleName,
      username,
      email,
      password,
      first_name,
      last_name,
      pen_name,
      name,
      publisher_id,
      tenant_slug,
    } = opts.input;
 
    const user = await prisma.$transaction(async (tx) => {
      // 1. Global identity checks
      const existing = await tx.user.findFirst({
        where: { OR: [{ username }, { email }] },
      });
 
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            existing.username === username ? "Username is taken." : "Email is taken.",
        });
      }
 
      // 2. Create the base user
      const user = await tx.user.create({
        data: {
          username: username as string,
          email: email as string,
          password: bcrypt.hashSync(password as string, 10),
          first_name: first_name as string,
          last_name: last_name as string,
          // email_verified_at intentionally null
        },
      });
 
      let resolvedTenantSlug: string | null = null;
 
      // 3. Role-based promotion
      if (roleName === "Publisher") {
        const tenant = await tx.tenant.create({
          data: {
            name: name,
            slug: tenant_slug?.toLowerCase() || username?.toLowerCase() || "",
            contact_email: email,
          },
        });
        resolvedTenantSlug = tenant.slug;
 
        await tx.publisher.create({
          data: {
            user_id: user.id,
            tenant_id: tenant.id,
            slug: resolvedTenantSlug,
          },
        });
      } else if (roleName === "Author") {
        const defaultPublisher = await tx.publisher.findUnique({
          where: { slug: "booka" },
        });
 
        await tx.author.create({
          data: {
            name: pen_name?.trim() || name || `${first_name} ${last_name}`,
            pen_name: pen_name?.trim() || null,
            user_id: user.id,
            publisher_id: publisher_id || defaultPublisher?.id || null,
          },
        });
      }
 
      // 4. Assign permission claim
      await tx.claim.create({
        data: {
          user_id: user.id,
          role_name: roleName!.toLowerCase(),
          type: "ROLE",
          active: true,
          tenant_slug: resolvedTenantSlug,
        },
      });
 
      return user;
    });
 
    // ── Send verification email (outside transaction — non-fatal) ──
    try {
      const token = await createVerificationToken(user.id, "EMAIL_VERIFY");
      await sendVerificationEmail({
        to: user.email as string,
        firstName: user.first_name as string,
        token,
      });
    } catch (emailErr) {
      console.error("[createUser] Failed to send verification email:", emailErr);
    }
 
    return user;
  });

export const upgradeToAuthor = publicProcedure
  .input(upgradeToAuthorSchema)
  .mutation(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;
    if (!userId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in." });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { author: true },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
    }

    if (!user.author) {
      await prisma.$transaction(async (tx) => {
        await tx.author.create({
          data: {
            user_id: user.id,
            name: `${user.first_name} ${user.last_name || ""}`.trim() || user.username || user.email,
            slug: user.username?.toLowerCase().trim().replace(/\s+/g, "-") || null,
          },
        });

        await tx.claim.create({
          data: {
            user_id: user.id,
            role_name: "author",
            type: "ROLE",
            active: true,
          },
        });
      });
    }

    const verificationSent = await sendUpgradeVerificationEmail(user.id);

    return {
      success: true,
      requiresVerification: !user.email_verified_at,
      verificationSent,
    };
  });

export const upgradeToPublisher = publicProcedure
  .input(upgradeToPublisherSchema)
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id;
    if (!userId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in." });
    }

    const cleanSlug = input.tenant_slug.toLowerCase().trim().replace(/\s+/g, "-");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { publisher: true },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
    }

    if (user.publisher) {
      return {
        success: true,
        requiresVerification: !user.email_verified_at,
        verificationSent: false,
      };
    }

    const [tenantExists, publisherExists] = await Promise.all([
      prisma.tenant.findUnique({ where: { slug: cleanSlug }, select: { id: true } }),
      prisma.publisher.findUnique({ where: { slug: cleanSlug }, select: { id: true } }),
    ]);

    if (tenantExists || publisherExists) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This storefront slug is already in use.",
      });
    }

    await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: input.organization_name,
          slug: cleanSlug,
          contact_email: user.email,
        },
      });

      await tx.publisher.create({
        data: {
          user_id: user.id,
          tenant_id: tenant.id,
          slug: cleanSlug,
        },
      });

      await tx.claim.create({
        data: {
          user_id: user.id,
          role_name: "publisher",
          type: "ROLE",
          active: true,
          tenant_slug: cleanSlug,
        },
      });
    });

    const verificationSent = await sendUpgradeVerificationEmail(user.id);

    return {
      success: true,
      requiresVerification: !user.email_verified_at,
      verificationSent,
    };
  });
 
// --- PLACE AVAILABILITY CHECKS BELOW ---

export const checkUsernameAvailability = publicProcedure
  .input(z.object({ username: z.string() }))
  .query(async ({ input }) => {
    const user = await prisma.user.findUnique({ where: { username: input.username } });
    return { available: !user };
  });

export const checkSlugAvailability = publicProcedure
  .input(z.object({ slug: z.string() }))
  .query(async ({ input }) => {
    // Check both Tenant and Publisher slugs to be safe
    const [tenant, publisher] = await Promise.all([
      prisma.tenant.findUnique({ where: { slug: input.slug.toLowerCase() } }),
      prisma.publisher.findUnique({ where: { slug: input.slug.toLowerCase() } })
    ]);
    return { available: !tenant && !publisher };
  });

export const updateUser = publicProcedure.input(createUserSchema).mutation(async (opts)=>{
  return await prisma.user.update({
    where: { id: opts.input.id },
    include: { claims: true },
    data: {
      email: opts.input.email,
      phone_number: opts.input.phone_number,
      username: opts.input.username,
      active: true,
      password: bcrypt.hashSync(opts.input.password as string, 10) ?? ""
    },

  });
});

export const deleteUser = publicProcedure.input(deleteUserSchema).mutation(async (opts)=>{
  return await prisma.user.update({
    where: { id: opts.input.id },
    data: { deleted_at: new Date() },
  });
});

export const toggleUserActive = publicProcedure.input(toggleUserActiveSchema).mutation(async (opts) => {
  return await prisma.user.update({
    where: { id: opts.input.id },
    data: { active: opts.input.active },
  });
});

export const permanentDeleteUser = publicProcedure.input(permanentDeleteUserSchema).mutation(async (opts) => {
  const user = await prisma.user.findUnique({
    where: { id: opts.input.id },
    include: {
      publisher: {
        include: {
          books: {
            where: { deleted_at: null },
            select: { id: true },
          },
        },
      },
      author: {
        include: {
          books: {
            where: { deleted_at: null },
            select: { id: true },
          },
          primary_books: {
            where: { deleted_at: null },
            select: { id: true },
          },
        },
      },
      customers: {
        include: {
          orders: {
            take: 1,
            select: { id: true },
          },
        },
      },
      claims: { select: { id: true } },
      Review: { take: 1, select: { id: true } },
      Cart: { take: 1, select: { id: true } },
    },
  });

  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
  }

  const hasDependencies =
    (user.publisher?.books.length ?? 0) > 0 ||
    (user.author?.books.length ?? 0) > 0 ||
    (user.author?.primary_books.length ?? 0) > 0 ||
    user.customers.some((customer) => customer.orders.length > 0) ||
    user.Review.length > 0 ||
    user.Cart.length > 0;

  if (hasDependencies) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This user cannot be permanently deleted because the account still has related books, orders, or other records.",
    });
  }

  await prisma.$transaction(async (tx) => {
    if (user.claims.length > 0) {
      await tx.claim.deleteMany({ where: { user_id: user.id } });
    }

    await tx.customer.deleteMany({ where: { user_id: user.id } });

    if (user.author) {
      await tx.author.delete({ where: { id: user.author.id } });
    }

    if (user.publisher) {
      await tx.publisher.delete({ where: { id: user.publisher.id } });
    }

    await tx.user.delete({ where: { id: user.id } });
  });

  return { success: true };
});

export const getAllUsers = publicProcedure.query(async ()=>{
  return await prisma.user.findMany({
    where: { deleted_at: null },
    include: {
      author: { select: { id: true } },
      publisher: { select: { id: true, slug: true } },
      customers: { select: { id: true } },
      claims: {
        where: { active: true, type: "ROLE" },
        select: { role_name: true },
      },
    },
    orderBy: { created_at: "desc" },
  });
});

export const getAllRoles = publicProcedure.query(async ()=>{
  return await prisma.role.findMany({ where: { active: true } });
});

export const createRole = publicProcedure.input(createRoleSchema).mutation(async (opts) => {
  const { name, active, built_in, permissionIds } = opts.input;

  const role = await prisma.role.create({
    data: {
      name,
      active,
      built_in,
    },
  });

  if (permissionIds && permissionIds.length > 0) {
    const permissionRoles = permissionIds.map((permissionId) => ({
      role_name: role.name,
      permission_id: permissionId,
      active: true,
    }));

    await prisma.permissionRole.createMany({ data: permissionRoles });
  }

  return role;
});

export const assignRoleToUser = publicProcedure.input(assignRoleSchema).mutation(async (opts) => {
  const { user_id, role_name } = opts.input;

  await prisma.claim.deleteMany({
    where: {
      user_id,
      role_name: { not: null },
    },
  });

  const newClaim = await prisma.claim.create({
    data: {
      user_id,
      role_name,
      active: true,
      type: "ROLE"
    },
  });

  return newClaim;
});

export const getUserById = publicProcedure.input(deleteUserSchema).query(async (opts) => {
  return await prisma.user.findUnique({
    where: {
      id: opts.input.id,
      deleted_at: null,
    },
    include: { 
      author: true, 
      publisher: { 
        include: { tenant: true } 
      }, 
      claims: true, 
      customers: true 
    }
  });
});

export const updateUserProfile = publicProcedure
  .input(editProfileSchema)
  .mutation(async ({ input }) => {
    const { id, first_name, last_name, username, bio, organization_name, phone_number, profilePicture } = input;
    
    // Identity Casing preserved for Username
    const rawUsername = username.trim();
    // URL Slug strictly lowercase
    const cleanSlug = username.toLowerCase().trim().replace(/\s+/g, "-");

    const user = await prisma.user.findUnique({ 
      where: { id },
      include: { publisher: true, author: true }
    });

    return await prisma.$transaction(async (tx) => {
      // 1. Update Core User (Preserve Casing)
      const updatedUser = await tx.user.update({
        where: { id },
        data: { first_name, last_name, username: rawUsername, phone_number }
      });

      // 2. Update Publisher & Tenant (Use cleanSlug for URLs)
      if (user?.publisher) {
        await tx.publisher.update({
          where: { id: user.publisher.id },
          data: { bio, slug: cleanSlug, profile_picture: profilePicture }
        });

        if (user.publisher.tenant_id) {
          await tx.tenant.update({
            where: { id: user.publisher.tenant_id },
            data: { 
              name: organization_name, 
              slug: cleanSlug,
            }
          });
          
          await tx.claim.updateMany({
            where: { user_id: id, type: "ROLE" },
            data: { tenant_slug: cleanSlug }
          });
        }
      }

      // 3. Update Author
      if (user?.author) {
        await tx.author.update({
          where: { id: user.author.id },
          data: { bio, slug: cleanSlug, name: `${first_name} ${last_name}`, profile_picture: profilePicture }
        });
      }

      return updatedUser;
    });
  });


export const updateProfileImage = publicProcedure
  .input(updateProfileImageSchema)
  .mutation(async ({ input }) => {
    const { id, profilePicture } = input;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { publisher: true, author: true }
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return await prisma.$transaction(async (tx) => {
      // Update Publisher if exists
      if (user.publisher) {
        await tx.publisher.update({
          where: { id: user.publisher.id },
          data: { profile_picture: profilePicture }
        });
      }

      // Update Author if exists
      if (user.author) {
        await tx.author.update({
          where: { id: user.author.id },
          data: { profile_picture: profilePicture }
        });
      }

      return { success: true };
    });
  });

export const signUpCustomer = publicProcedure
  .input(signUpSchema)
  .mutation(async ({ input }) => {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.email }, { username: input.username }],
      },
    });
 
    if (existingUser) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "User with this email or username already exists",
      });
    }
 
    const hashedPassword = await hash(input.password, 12);
 
    const { user } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          username: input.username,
          password: hashedPassword,
          first_name: input.first_name,
          last_name: input.last_name,
          active: true,
          // email_verified_at intentionally left null — pending verification
        },
      });
 
      await tx.customer.create({
        data: {
          user_id: user.id,
          name: `${input.first_name} ${input.last_name}`,
        },
      });
 
      return { user };
    });
 
    // ── Send verification email (outside transaction — non-fatal) ──
    try {
      const token = await createVerificationToken(user.id, "EMAIL_VERIFY");
      await sendVerificationEmail({
        to: user.email,
        firstName: user.first_name,
        token,
      });
    } catch (emailErr) {
      // Log but don't fail the signup — user can resend from verify page
      console.error("[signup] Failed to send verification email:", emailErr);
    }
 
    return { success: true, userId: user.id };
  });
