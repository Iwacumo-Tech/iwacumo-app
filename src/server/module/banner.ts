
import prisma from "@/lib/prisma";
import { publicProcedure } from "@/server/trpc";
import { z } from "zod";


export const createBannerSchema = z.object({
  image: z.string(), 
});

export const toggleBannerSchema = z.object({
  id: z.string(), 
});

export const getAllBanners = publicProcedure.query(async () => {
  return await prisma.banner.findMany({
    where: { deleted_at: null }, 
    orderBy: { createdAt: "desc" }, 
  });
});


export const createBanner = publicProcedure
  .input(createBannerSchema)
  .mutation(async (opts) => {
    const { image } = opts.input;

    return await prisma.banner.create({
      data: {
        image,       
        isShow: true, // Default value
      },
    });
  });


export const toggleBannerVisibility = publicProcedure
  .input(toggleBannerSchema)
  .mutation(async (opts) => {
    const { id } = opts.input;

    const banner = await prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new Error("Banner not found");
    }

    return await prisma.banner.update({
      where: { id },
      data: { isShow: !banner.isShow }, 
    });
  });
