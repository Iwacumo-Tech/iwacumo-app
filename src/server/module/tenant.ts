import prisma from "@/lib/prisma";
import { createTenantSchema, deleteTenantSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";
import { z } from "zod";

/**
 * Tenant Module
 * Location: src/server/module/tenant.ts
 * * Augmented for Phase C Dashboard & Branding
 */

export const getTenantDashboardStats = publicProcedure
  .input(z.object({ tenant_id: z.string() }))
  .query(async ({ input }) => {
    // 1. Get all publishers belonging to this tenant
    const publishers = await prisma.publisher.findMany({
      where: { tenant_id: input.tenant_id },
      select: { id: true, slug: true }
    });

    const publisherIds = publishers.map(p => p.id);

    // 2. Aggregate stats across all publishers in the tenant
    const [authorCount, bookCount, salesData] = await Promise.all([
      prisma.author.count({ where: { publisher_id: { in: publisherIds } } }),
      prisma.book.count({ where: { publisher_id: { in: publisherIds }, deleted_at: null } }),
      prisma.orderLineItem.aggregate({
        where: {
          book_variant: { book: { publisher_id: { in: publisherIds } } },
          order: { payment_status: "captured" }
        },
        _sum: {
          total_price: true,
          publisher_earnings: true,
          platform_fee: true
        }
      })
    ]);

    return {
      publisherCount: publishers.length,
      totalAuthors: authorCount,
      totalBooks: bookCount,
      totalRevenue: salesData._sum.total_price || 0,
      totalPublisherEarnings: salesData._sum.publisher_earnings || 0,
      totalPlatformFees: salesData._sum.platform_fee || 0,
    };
  });

export const updateTenant = publicProcedure.input(z.object({
  id: z.string(),
  name: z.string().optional(),
  contact_email: z.string().optional(),
  slug: z.string().optional(),
  custom_domain: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  brand_color: z.string().optional().nullable(),
  secondary_color: z.string().optional().nullable(),
  social_links: z.any().optional(),
})).mutation(async (opts)=> {
  const { id, ...data } = opts.input;
  return await prisma.tenant.update({
    where: { id },
    data: {
      ...data,
      name: data.name ?? undefined,
      contact_email: data.contact_email ?? "",
      slug: data.slug ?? undefined,
      custom_domain: data.custom_domain ?? null,
    }
  });
});

export const deleteTenant = publicProcedure.input(deleteTenantSchema).mutation(async (opts) => {
  return await prisma.tenant.update({
    where: { id: opts.input.id },
    data: { deleted_at: new Date() }
  });
});

export const getAllTenant = publicProcedure.query(async ()=> {
  return await prisma.tenant.findMany({ 
    where: { deleted_at: null }, 
    include: { publishers: true, users: true }
  });
});

export const createTenant = publicProcedure
  .input(createTenantSchema) 
  .mutation(async (opts) => {
    const { name, contact_email, custom_domain, slug } = opts.input;
    return await prisma.tenant.create({
      data: {
        name: name ?? "", 
        contact_email: contact_email ?? "", 
        custom_domain: custom_domain ?? null, 
        slug: slug ?? "", 
      },
    });
  });

export const getTenantBySlug = publicProcedure
  .input(z.object({ slug: z.string() }))
  .query(async ({ input }) => {
    return await prisma.tenant.findUnique({
      where: { slug: input.slug },
      include: { publishers: true }
    });
  });


export const getStoreBySlug = publicProcedure
  .input(z.object({ slug: z.string() }))
  .query(async ({ input, ctx }) => {
    const tenant = await ctx.prisma.tenant.findUnique({
      where: { slug: input.slug },
      include: {
        publishers: {
          include: {
            books: {
              where: { published: true, deleted_at: null, status: { not: "archived" } },
              include: { 
                author: { include: { user: true } }, 
                categories: true 
              }
            }
          }
        },
        banners: { where: { isShow: true, deleted_at: null } },
        hero_slides: { where: { deleted_at: null } }
      }
    });

    if (!tenant) return null;

    // Use Tenant branding if available, otherwise fetch global system defaults
    const slides = tenant.hero_slides.length > 0 
      ? tenant.hero_slides 
      : await ctx.prisma.heroSlide.findMany({ where: { tenant_id: null, deleted_at: null } });

    const banners = tenant.banners.length > 0 
      ? tenant.banners 
      : await ctx.prisma.banner.findMany({ where: { tenant_id: null, deleted_at: null, isShow: true } });

    return {
      ...tenant,
      hero_slides: slides,
      banners: banners,
      books: tenant.publishers?.books || []
    };
  });
