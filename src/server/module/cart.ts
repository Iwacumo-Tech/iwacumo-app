import prisma from "@/lib/prisma";
import { z } from "zod";
import { publicProcedure } from "@/server/trpc";
import { CartSchema } from "../dtos";
import { TRPCError } from "@trpc/server";

const guestCartTransferItemSchema = z.object({
  book_image: z.string(),
  book_title: z.string(),
  book_type: z.string(),
  price: z.number().min(0),
  quantity: z.number().int().positive().optional(),
  total: z.number().min(0),
});

function isEbookCartType(bookType: string) {
  const normalized = bookType.toLowerCase();
  return normalized === "ebook" || normalized === "e-copy" || normalized.includes("ebook");
}



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
        deleted_at: null, // Only get non-deleted items
      },
      include: {
        user: true, // Include user details
      },
    });
  });

export const deleteCartItem = publicProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .mutation(async (opts) => {
    // Soft delete by setting deleted_at
    return await prisma.cart.update({
      where: { id: opts.input.id },
      data: { deleted_at: new Date() },
    });
  });

export const transferGuestCartToUser = publicProcedure
  .input(
    z.object({
      cart_items: z.array(guestCartTransferItemSchema),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id;

    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Please sign in before transferring your cart.",
      });
    }

    return await prisma.$transaction(async (tx) => {
      const activeCartItems = await tx.cart.findMany({
        where: {
          userId,
          deleted_at: null,
        },
      });

      const transferredItems = [];

      for (const guestItem of input.cart_items) {
        const guestQuantity = guestItem.quantity ?? 1;
        const existingItem = activeCartItems.find((cartItem) =>
          cartItem.book_title === guestItem.book_title &&
          cartItem.book_type === guestItem.book_type &&
          cartItem.book_image === guestItem.book_image &&
          cartItem.price === guestItem.price
        );

        if (existingItem) {
          const isDigital = isEbookCartType(existingItem.book_type);
          const nextQuantity = isDigital
            ? 1
            : (existingItem.quantity ?? 1) + guestQuantity;

          const updatedItem = await tx.cart.update({
            where: { id: existingItem.id },
            data: {
              quantity: nextQuantity,
              total: existingItem.price * nextQuantity,
            },
          });

          existingItem.quantity = updatedItem.quantity;
          existingItem.total = updatedItem.total;
          transferredItems.push(updatedItem);
          continue;
        }

        const normalizedQuantity = isEbookCartType(guestItem.book_type) ? 1 : guestQuantity;
        const createdItem = await tx.cart.create({
          data: {
            book_image: guestItem.book_image,
            book_title: guestItem.book_title,
            book_type: guestItem.book_type,
            price: guestItem.price,
            quantity: normalizedQuantity,
            total: guestItem.price * normalizedQuantity,
            userId,
          },
        });

        activeCartItems.push(createdItem);
        transferredItems.push(createdItem);
      }

      return transferredItems;
    });
  });
