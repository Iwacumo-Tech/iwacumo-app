import prisma from "@/lib/prisma";
import { z } from "zod";
import { publicProcedure } from "@/server/trpc";
import { CartSchema } from "../dtos";



export const createCart = publicProcedure
  .input(CartSchema)
  .mutation(async (opts) => {
    const { book_image, book_title, book_type, price, quantity, total, userId } = opts.input;

    return await prisma.cart.create({
      data: {
        book_image,
        book_title,
        book_type,
        price,
        quantity,
        total,
        user: userId
          ? {
              connect: {
                id: userId,
              },
            }
          : undefined, // Only connect if `user_id` is provided
      },
    });
  });

export const getCartsByUser = publicProcedure
  .input(
    z.object({
      user_id: z.string(), // Input must include a valid user ID
    })
  )
  .query(async (opts) => {
    return await prisma.cart.findMany({
      where: {
        userId: opts.input.user_id,
      },
      include: {
        user: true, // Include user details
      },
    });
  });
