import bcrypt from "bcryptjs";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { publicProcedure } from "@/server/trpc";
import { assignRoleSchema, createRoleSchema, createUserSchema, deleteUserSchema, editProfileSchema, signUpSchema } from "@/server/dtos";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const createUser = publicProcedure
  .input(createUserSchema)
  .mutation(async (opts) => {
    const { roleName, username, email, password, first_name, last_name, name, publisher_id, tenant_slug } = opts.input;

    // const masterSlug = username.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");

    return await prisma.$transaction(async (tx) => {
      // 1. GLOBAL IDENTITY CHECKS
      const existing = await tx.user.findFirst({
        where: { OR: [{ username }, { email }] }
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: existing.username === username ? "Username is taken." : "Email is taken."
        });
      }

      // 2. CREATE THE BASE USER (The Identity)
      const user = await tx.user.create({
        data: {
          username: username as string, 
          email: email as string,      
          password: bcrypt.hashSync(password as string, 10),
          first_name: first_name as string,
          last_name: last_name as string,
          // active: true,
        }
      });

      let resolvedTenantSlug: string | null = null;

      // 3. ROLE-BASED PROMOTION
      if (roleName === "Publisher") {
        // Publishers create a Brand (Tenant) immediately
        const tenant = await tx.tenant.create({
          data: {
            name: name, 
            slug: (tenant_slug?.toLowerCase()) || (username?.toLowerCase() || ""),
            contact_email: email,
          }
        });
        resolvedTenantSlug = tenant.slug;

        await tx.publisher.create({
          data: {
            user_id: user.id,
            tenant_id: tenant.id,
            slug: resolvedTenantSlug,
          }
        });
      } 
      else if (roleName === "Author") {
        // 1. Resolve the Default Publisher (Booka)
        const defaultPublisher = await tx.publisher.findUnique({
          where: { slug: "booka" } 
        });

        // 2. Link Author to the platform publisher if no specific publisher_id was provided
        await tx.author.create({
          data: {
            name: name || `${first_name} ${last_name}`,
            user_id: user.id,
            // slug: masterSlug,
            publisher_id: publisher_id || defaultPublisher?.id || null, // Auto-attach to Booka
          }
        });
      }
      // NOTE: "Customer/Reader" role does NOT create a record in the Customer table here.
      // They are just a User until they buy a book.

      // 4. ASSIGN THE PERMISSION CLAIM
      await tx.claim.create({
        data: {
          user_id: user.id,
          role_name: roleName!.toLowerCase(),
          type: "ROLE",
          active: true,
          tenant_slug: resolvedTenantSlug, // NULL for Readers and Authors
        },
      });

      return user;
    });
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

export const getAllUsers = publicProcedure.query(async ()=>{
  return await prisma.user.findMany({ where: { deleted_at: null } });
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
    const { id, first_name, last_name, username, bio, organization_name, phone_number } = input;
    
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
          data: { bio, slug: cleanSlug }
        });

        if (user.publisher.tenant_id) {
          await tx.tenant.update({
            where: { id: user.publisher.tenant_id },
            data: { 
              name: organization_name, 
              slug: cleanSlug 
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
          data: { bio, slug: cleanSlug, name: `${first_name} ${last_name}` }
        });
      }

      return updatedUser;
    });
  });

export const signUpCustomer = publicProcedure
  .input(signUpSchema)
  .mutation(async ({ input }) => {
    // 1. Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.email }, { username: input.username }]
      }
    });

    if (existingUser) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "User with this email or username already exists",
      });
    }

    // 2. Hash password and create User + Customer
    const hashedPassword = await hash(input.password, 12);

    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          username: input.username,
          password: hashedPassword,
          first_name: input.first_name,
          last_name: input.last_name,
          active: true,
        },
      });

      const customer = await tx.customer.create({
        data: {
          user_id: user.id,
          name: `${input.first_name} ${input.last_name}`,
        },
      });

      return { success: true, userId: user.id };
    });
  });