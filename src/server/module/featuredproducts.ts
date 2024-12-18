import prisma from "@/lib/prisma";
import { publicProcedure } from "@/server/trpc";
import { bookSlideSchema } from "@/server/dtos";

export const getAllFeaturedProducts = publicProcedure.query(async () => {
  return await prisma.featuredProducts.findMany({ where: { deleted_at: null } });
});

export const addFeaturedProducts = publicProcedure
  .input(bookSlideSchema)
  .mutation(async (opts) => {
    return await prisma.featuredProducts.create({
      data: {
        title: opts.input.title,
        Price: opts.input.price,
        description: opts.input.description,
        image: opts.input.image,
      },
    });
  });
