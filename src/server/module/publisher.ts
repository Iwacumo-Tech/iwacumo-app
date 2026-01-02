import prisma from "@/lib/prisma";
import { createPublisherSchema, updatePublisherSchema, deletePublisherSchema, getPublisherByOrgSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";

/**
 * Publisher Module
 * * Phase C: Added getPublisherDashboardStats for Publisher Dashboard.
 * * Maintains the robust multi-step creation flow for Tenants, Users, and Roles.
 */

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

// --- Existing Logic: Complex Multi-tenant Registration ---
export const createPublisher = publicProcedure
  .input(createPublisherSchema)
  .mutation(async (opts) => {
    const { username, email, password, phone_number, first_name, last_name, date_of_birth, bio, custom_domain, profile_picture, tenant_id, tenant_name, slug } = opts.input;

    return await prisma.$transaction(async (tx) => {
      let tenantSlug: string | null = null;
      let resolvedTenantId: string;

      if (tenant_name && !tenant_id) {
        const baseSlug = tenant_name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
        let candidate = baseSlug || `org-${Date.now()}`;
        let suffix = 1;
        while (true) {
          const existing = await tx.tenant.findUnique({ where: { slug: candidate } });
          if (!existing) break;
          candidate = `${baseSlug}-${suffix++}`;
        }
        const createdTenant = await tx.tenant.create({ data: { name: tenant_name, slug: candidate } });
        resolvedTenantId = createdTenant.id;
        tenantSlug = createdTenant.slug ?? null;
      } else {
        const tenant = await tx.tenant.findUnique({ where: { id: tenant_id! } });
        if (!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
        resolvedTenantId = tenant.id;
        tenantSlug = tenant.slug ?? null;
      }

      const user = await tx.user.create({
        data: {
          username, email: email ?? "", password: bcrypt.hashSync(password, 10), phone_number: phone_number ?? "",
          first_name: first_name ?? "", last_name: last_name ?? "", date_of_birth: date_of_birth ?? new Date(),
        },
      });

      const publisherRole = await tx.role.findUnique({ where: { name: "publisher" } });
      if (!publisherRole) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: 'Default "Publisher" role not found' });

      await tx.claim.create({
        data: { user_id: user.id, role_name: publisherRole.name, active: true, type: "ROLE", tenant_slug: tenantSlug },
      });

      const permissions = await tx.permissionRole.findMany({ where: { role_name: publisherRole.name }, include: { permission: true } });
      const uniquePermissionIds = Array.from(new Set(permissions.map((pr) => pr.permission.id)));

      if (uniquePermissionIds.length > 0) {
        await tx.claim.createMany({
          data: uniquePermissionIds.map((pid) => ({ user_id: user.id, permission_id: pid, active: true, type: "PERMISSION", tenant_slug: tenantSlug })),
          skipDuplicates: true,
        });
      }

      return await tx.publisher.create({
        data: { bio: bio ?? null, custom_domain: custom_domain ?? null, profile_picture: profile_picture ?? null, slug: slug ?? "",
          tenant: { connect: { id: resolvedTenantId } }, user: { connect: { id: user.id } } },
      });
    });
  });

export const updatePublisher = publicProcedure.input(updatePublisherSchema).mutation(async (opts) => {
  const { id, ...data } = opts.input;
  return await prisma.publisher.update({ where: { id }, data });
});

export const getAllPublisher = publicProcedure.query(async () => {
  return await prisma.publisher.findMany({ where: { deleted_at: null }, include: { tenant: true, user: true } });
});

export const getPublisherByOrganization = publicProcedure.input(getPublisherByOrgSchema).query(async (opts) => {
  return await prisma.publisher.findMany({ where: { tenant: { name: opts.input.name }, deleted_at: null }, include: { tenant: true, user: true } });
});

export const deletePublisher = publicProcedure.input(deletePublisherSchema).mutation(async (opts) => {
  return await prisma.publisher.update({ where: { id: opts.input.id }, data: { deleted_at: new Date() } });
});