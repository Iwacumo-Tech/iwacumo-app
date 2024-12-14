import prisma from "@/lib/prisma";
import { createCustomerSchema, deleteCustomerSchema, findBookByIdSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";

export const createCustomer = publicProcedure.input(createCustomerSchema).mutation(async (opts) => {
  const user = await prisma.user.create({
    data: {
      username: opts.input.username,
      email: opts.input.email ?? "",
      password: opts.input.password ?? "",
      phone_number: opts.input.phone_number ?? "",
      first_name: opts.input.first_name ?? ""
    }
  });

  return await prisma.customer.create({
    data: {
      author_id: opts.input.author_id ?? null,
      publisher_id: opts.input.publisher_id ?? null,
      user_id: user.id

    },
  });
});

export const updateCustomer = publicProcedure.input(createCustomerSchema).mutation(async (opts) => {
  return await prisma.customer.update({
    where: { id: opts.input.id },
    data: {
      author_id: opts.input.author_id,
      publisher_id: opts.input.publisher_id,
    },
  });
});

export const deleteCustomer = publicProcedure.input(deleteCustomerSchema).mutation(async (opts) => {
  return await prisma.customer.update({
    where: { id: opts.input.id },
    data: { deleted_at: new Date() },
  });
});

export const getAllCustomers = publicProcedure.query(async () => {
  return await prisma.customer.findMany({ where: { deleted_at: null } });
});

export const getCustomersByUser = publicProcedure.input(findBookByIdSchema).query(async (opts) => {
  const user = await prisma.user.findUnique({
    where: { id: opts.input.id },
    include: { author: true, publisher: true }
  });

  if(user && user.publisher) {
    return await prisma.customer.findMany({
      where: { publisher_id: user.publisher.id, deleted_at: null },
      include: { purchased_books: true, author: true }
    });
  }

  if(user && user.author) {
    return await prisma.customer.findMany({
      where: { author_id: user.author.id, deleted_at: null },
      include: { author: true, purchased_books: true, publisher: true }
    });
  }
});
