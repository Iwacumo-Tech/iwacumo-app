import prisma from "@/lib/prisma";
import { publicProcedure } from "@/server/trpc";
import { createBannerSchema } from "@/server/dtos";
import { z } from "zod";
import { auth } from "@/auth";
import { TRPCError } from "@trpc/server";

export const getAllBanners = publicProcedure.query(async () => {
  const session = await auth();
  if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });

  const isSuperAdmin = session.roles?.some(r => r.name === "super-admin");

  if (isSuperAdmin) {
    return await prisma.banner.findMany({
      where: { deleted_at: null },
      orderBy: { createdAt: "desc" },
      include: { tenant: { select: { name: true, slug: true } } },
    });
  }

  const publisher = await prisma.publisher.findUnique({
    where: { user_id: session.user.id },
  });

  return await prisma.banner.findMany({
    where: { deleted_at: null, tenant_id: publisher?.tenant_id ?? "__none__" },
    orderBy: { createdAt: "desc" },
    include: { tenant: { select: { name: true, slug: true } } },
  });
});

export const createBanner = publicProcedure
  .input(createBannerSchema)
  .mutation(async (opts) => {
    const session = await auth();
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });

    const isSuperAdmin = session.roles?.some(r => r.name === "super-admin");

    let tenantId: string | null = null;
    if (!isSuperAdmin) {
      const publisher = await prisma.publisher.findUnique({
        where: { user_id: session.user.id },
      });
      if (!publisher?.tenant_id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tenant found for this publisher." });
      }
      tenantId = publisher.tenant_id;
    }

    return await prisma.banner.create({
      data: {
        image:     opts.input.image,
        isShow:    true,
        tenant_id: tenantId,
      },
    });
  });

export const toggleBannerVisibility = publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async (opts) => {
    const session = await auth();
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });

    const banner = await prisma.banner.findUnique({ where: { id: opts.input.id } });
    if (!banner) throw new TRPCError({ code: "NOT_FOUND", message: "Banner not found." });

    return await prisma.banner.update({
      where: { id: opts.input.id },
      data: { isShow: !banner.isShow },
    });
  });

// Public-facing — only global banners (tenant_id: null) for the main shop
export const getGlobalBanners = publicProcedure.query(async () => {
  return await prisma.banner.findMany({
    where: { deleted_at: null, tenant_id: null, isShow: true },
    orderBy: { createdAt: "desc" },
  });
});

export const deleteBanner = publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async (opts) => {
    const session = await auth();
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
    return await prisma.banner.update({
      where: { id: opts.input.id },
      data: { deleted_at: new Date() },
    });
  });