import prisma from "@/lib/prisma";
import { reviewSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";
import { z } from "zod";

export const createReview = publicProcedure
  .input(reviewSchema)
  .mutation(async (opts) => {
    return await prisma.review.create({
      data: {
       rating: opts.input.rating,
       comment: opts.input.comment,
       name: opts.input.name,
       email: opts.input.email,
       book : {
        connect : {
            id: opts.input.book_id,
        }
       },
       user : {
         connect : {
             id: opts.input.user_id,
         }
       }
      },
    });
  });

export const getReviewsByBook = publicProcedure
  .input(
    z.object({
      book_id: z.string()
    })
  )
  .query(async (opts) => {
    return await prisma.review.findMany({
      where: {
        book_id: opts.input.book_id,
      },
      include: { user: true , book: true},
    });
  });