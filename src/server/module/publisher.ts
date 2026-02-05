import prisma from "@/lib/prisma";
import { createPublisherSchema, updatePublisherSchema, deletePublisherSchema, getPublisherByOrgSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";

// --- Dashboard Analytics ---
export const getPublisherDashboardStats = publicProcedure
  .input(z.object({ publisher_id: z.string() }))
  .query(async ({ input }) => {
    const [authorCount, bookCount, salesSummary] = await Promise.all([
      prisma.author.count({ where: { publisher_id: input.publisher_id } }),
      prisma.book.count({ where: { publisher_id: input.publisher_id, deleted_at: null } }),
      prisma.orderLineItem.aggregate({
        where: {
          book_variant: { book: { publisher_id: input.publisher_id } },
          order: { payment_status: "captured" }
        },
        _sum: { publisher_earnings: true, total_price: true }
      })
    ]);

    const recentOrders = await prisma.order.findMany({
      where: { publisher_id: input.publisher_id, payment_status: "captured" },
      take: 5,
      orderBy: { created_at: 'desc' },
      include: { customer: { select: { name: true } } }
    });

    return {
      totalAuthors: authorCount,
      totalBooks: bookCount,
      totalEarnings: salesSummary._sum.publisher_earnings || 0,
      totalRevenue: salesSummary._sum.total_price || 0,
      recentOrders
    };
  });

// --- REFINED: Unified Tenant & Publisher Registration ---
export const createPublisher = publicProcedure
  .input(createPublisherSchema)
  .mutation(async (opts) => {
    const { 
      username, email, password, phone_number, first_name, last_name, 
      date_of_birth, bio, custom_domain, profile_picture, 
      tenant_id, tenant_name, slug 
    } = opts.input;

    // 1. Move heavy computation outside the transaction to prevent timeout
    const hashedPassword = bcrypt.hashSync(password, 10);

    return await prisma.$transaction(async (tx) => {
      let resolvedTenantId: string;
      
      // Use the provided slug as the primary identifier for the Tenant
      const masterSlug = slug.toLowerCase().trim().replace(/\s+/g, "-");

      // Check if slug is already taken globally
      const existingSlug = await tx.tenant.findUnique({ where: { slug: masterSlug } });
      if (existingSlug) {
        throw new TRPCError({ 
          code: "CONFLICT", 
          message: "This organization slug is already in use." 
        });
      }

      // 2. Create the Organization (Tenant)
      if (tenant_name && !tenant_id) {
        const createdTenant = await tx.tenant.create({ 
          data: { 
            name: tenant_name, 
            slug: masterSlug // One slug for both entities
          } 
        });
        resolvedTenantId = createdTenant.id;
      } else {
        const tenant = await tx.tenant.findUnique({ where: { id: tenant_id! } });
        if (!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
        resolvedTenantId = tenant.id;
      }

      // 3. Create the Lead Publisher (User)
      const user = await tx.user.create({
        data: {
          username, 
          email: email ?? "", 
          password: hashedPassword, 
          phone_number: phone_number ?? "",
          first_name: first_name ?? "", 
          last_name: last_name ?? "", 
          date_of_birth: date_of_birth ?? new Date(),
        },
      });

      // 4. Permission Gating
      const publisherRole = await tx.role.findUnique({ where: { name: "publisher" } });
      if (!publisherRole) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: 'Default "Publisher" role not found' });

      // Link User to Role and the specific Organization (Tenant)
      await tx.claim.create({
        data: { 
          user_id: user.id, 
          role_name: publisherRole.name, 
          active: true, 
          type: "ROLE", 
          tenant_slug: masterSlug 
        },
      });

      const permissions = await tx.permissionRole.findMany({ 
        where: { role_name: publisherRole.name }, 
        include: { permission: true } 
      });
      const uniquePermissionIds = Array.from(new Set(permissions.map((pr) => pr.permission.id)));

      if (uniquePermissionIds.length > 0) {
        await tx.claim.createMany({
          data: uniquePermissionIds.map((pid) => ({ 
            user_id: user.id, 
            permission_id: pid, 
            active: true, 
            type: "PERMISSION", 
            tenant_slug: masterSlug 
          })),
          skipDuplicates: true,
        });
      }

      // 5. Finalize Publisher Record
      return await tx.publisher.create({
        data: { 
          bio: bio ?? null, 
          custom_domain: custom_domain ?? null, 
          profile_picture: profile_picture ?? null, 
          slug: masterSlug, // Syncing slug
          tenant: { connect: { id: resolvedTenantId } }, 
          user: { connect: { id: user.id } } 
        },
      });
    }, {
      timeout: 10000 // Extended timeout for safety
    });
  });

export const updatePublisher = publicProcedure
  .input(updatePublisherSchema)
  .mutation(async (opts) => {
    const { id, tenant_id, tenant_name, slug, bio, custom_domain, profile_picture } = opts.input;

    return await prisma.publisher.update({
      where: { id },
      data: {
        // Update Publisher metadata
        bio,
        slug, // Syncing the publisher slug
        custom_domain: custom_domain || `${slug}.booka.africa`, // Standardized subdomain
        profile_picture,
        
        // Reach into the Tenant table and update the organization details
        tenant: {
          update: {
            where: { id: tenant_id },
            data: {
              name: tenant_name,
              slug: slug // Ensuring organization slug matches publisher slug
            }
          }
        }
      }
    });
  });

export const getAllPublisher = publicProcedure.query(async () => {
  return await prisma.publisher.findMany({ 
    where: { deleted_at: null }, 
    include: { tenant: true, user: true } 
  });
});

export const getPublisherByOrganization = publicProcedure.input(getPublisherByOrgSchema).query(async (opts) => {
  return await prisma.publisher.findMany({ 
    where: { tenant: { name: opts.input.name }, deleted_at: null }, 
    include: { tenant: true, user: true } 
  });
});

export const deletePublisher = publicProcedure.input(deletePublisherSchema).mutation(async (opts) => {
  // Cascading deletion logic: Invalidate the publisher record
  return await prisma.publisher.update({ 
    where: { id: opts.input.id }, 
    data: { deleted_at: new Date() } 
  });
});


export const checkSlugAvailability = publicProcedure
  .input(z.object({ slug: z.string() }))
  .query(async ({ input }) => {
    // Check both Tenants and Publisher records to ensure global uniqueness
    const existing = await prisma.tenant.findUnique({
      where: { slug: input.slug.toLowerCase().trim() },
      select: { id: true }
    });
    
    return { available: !existing };
  });