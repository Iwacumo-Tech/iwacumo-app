import prisma from "@/lib/prisma";
import { heroSlideSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";
import { z } from "zod";
import { auth } from "@/auth";
import { TRPCError } from "@trpc/server";

export const createHeroSlide = publicProcedure
  .input(heroSlideSchema)
  .mutation(async (opts) => {
    const session = await auth();
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });

    const isSuperAdmin = session.roles?.some(r => r.name === "super-admin");

    // Super-admin → global (tenant_id: null)
    // Publisher → scoped to their tenant
    let tenantId: string | null = null;
    if (!isSuperAdmin) {
      const publisher = await prisma.publisher.findUnique({
        where: { user_id: session.user.id },
        include: { tenant: true },
      });
      if (!publisher?.tenant_id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tenant found for this publisher." });
      }
      tenantId = publisher.tenant_id;
    }

    return await prisma.heroSlide.create({
      data: {
        title:       opts.input.title,
        subtitle:    opts.input.subtitle,
        description: opts.input.description,
        image:       opts.input.image,
        buttonText:  opts.input.buttonText,
        buttonRoute: opts.input.buttonRoute,
        tenant_id:   tenantId,
      },
    });
  });

// Admin dashboard — super-admin sees all, publisher sees only theirs
export const getAllHeroSlides = publicProcedure.query(async () => {
  const session = await auth();
  if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });

  const isSuperAdmin = session.roles?.some(r => r.name === "super-admin");

  if (isSuperAdmin) {
    return await prisma.heroSlide.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
      include: { tenant: { select: { name: true, slug: true } } },
    });
  }

  const publisher = await prisma.publisher.findUnique({
    where: { user_id: session.user.id },
  });

  return await prisma.heroSlide.findMany({
    where: { deleted_at: null, tenant_id: publisher?.tenant_id ?? "__none__" },
    orderBy: { created_at: "desc" },
    include: { tenant: { select: { name: true, slug: true } } },
  });
});

// Public-facing — only global slides (tenant_id: null) for the main shop
export const getGlobalHeroSlides = publicProcedure.query(async () => {
  return await prisma.heroSlide.findMany({
    where: { deleted_at: null, tenant_id: null },
    orderBy: { created_at: "desc" },
  });
});

export const deleteHeroSlide = publicProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async (opts) => {
    const session = await auth();
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
    return await prisma.heroSlide.update({
      where: { id: opts.input.id },
      data: { deleted_at: new Date() },
    });
  });