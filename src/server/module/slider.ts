import prisma from "@/lib/prisma";
import { heroSlideSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";

export const createHeroSlide = publicProcedure
  .input(heroSlideSchema)
  .mutation(async (opts) => {
    return await prisma.heroSlide.create({
      data: {
        title: opts.input.title,
        subtitle: opts.input.subtitle,
        description: opts.input.description,
        image: opts.input.image,
        buttonText: opts.input.buttonText,
        buttonRoute: opts.input.buttonRoute,
      },
    });
  });

export const getAllHeroSlides = publicProcedure.query(async () => {
  return await prisma.heroSlide.findMany({ where: { deleted_at: null } });
});
