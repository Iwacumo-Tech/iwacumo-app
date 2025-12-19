import prisma from "@/lib/prisma";
import { createCustomerSchema, deleteCustomerSchema, findBookByIdSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const createCustomer = publicProcedure.input(createCustomerSchema).mutation(async (opts) => {
  return await prisma.$transaction(async (tx) => {
    // Create the user
    const user = await tx.user.create({
      data: {
        username: opts.input.username,
        email: opts.input.email ?? "",
        password: opts.input.password ? bcrypt.hashSync(opts.input.password, 10) : "",
        phone_number: opts.input.phone_number ?? "",
        first_name: opts.input.first_name ?? "",
        last_name: opts.input.last_name ?? ""
      }
    });

    // Create the customer
    const customer = await tx.customer.create({
      data: {
        author_id: opts.input.author_id ?? null,
        publisher_id: opts.input.publisher_id ?? null,
        user_id: user.id
      },
    });

    // Get tenant_slug from publisher if publisher_id is set
    let tenantSlug: string | null = null;
    if (opts.input.publisher_id) {
      const publisher = await tx.publisher.findUnique({
        where: { id: opts.input.publisher_id },
        include: { tenant: true }
      });
      if (publisher?.tenant?.slug) {
        tenantSlug = publisher.tenant.slug;
      }
    }

    // Ensure the "customer" role exists
    const customerRole = await tx.role.findUnique({
      where: { name: "customer" },
    });

    if (!customerRole) {
      throw new Error('Default "customer" role not found. Please run the seed script.');
    }

    // Create a claim with the "customer" role
    await tx.claim.create({
      data: {
        user_id: user.id,
        role_name: customerRole.name,
        active: true,
        type: "ROLE",
        tenant_slug: tenantSlug,
      },
    });

    return customer;
  });
});

export const updateCustomer = publicProcedure.input(createCustomerSchema).mutation(async (opts) => {
  return await prisma.$transaction(async (tx) => {
    // Get the customer to find the user_id
    const customer = await tx.customer.findUnique({
      where: { id: opts.input.id },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Update the user's information if provided
    if (opts.input.first_name !== undefined || opts.input.last_name !== undefined || 
        opts.input.email !== undefined || opts.input.phone_number !== undefined || 
        opts.input.username !== undefined) {
      await tx.user.update({
        where: { id: customer.user_id },
        data: {
          ...(opts.input.first_name !== undefined && { first_name: opts.input.first_name }),
          ...(opts.input.last_name !== undefined && { last_name: opts.input.last_name }),
          ...(opts.input.email !== undefined && { email: opts.input.email }),
          ...(opts.input.phone_number !== undefined && { phone_number: opts.input.phone_number }),
          ...(opts.input.username !== undefined && { username: opts.input.username }),
        },
      });
    }

    // Update the customer
    return await tx.customer.update({
      where: { id: opts.input.id },
      data: {
        author_id: opts.input.author_id,
        publisher_id: opts.input.publisher_id,
      },
    });
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

// Register guest customer and transfer cart from localStorage
export const registerGuestAndTransferCart = publicProcedure
  .input(
    z.object({
      customer_data: createCustomerSchema,
      cart_items: z.array(
        z.object({
          book_image: z.string(),
          book_title: z.string(),
          book_type: z.string(),
          price: z.number(),
          quantity: z.number().optional(),
          total: z.number(),
        })
      ),
    })
  )
  .mutation(async (opts) => {
    return await prisma.$transaction(async (tx) => {
      // Find publisher_id from first book in cart
      let publisherId: string | null = null;
      let tenantSlug: string | null = null;

      if (opts.input.cart_items.length > 0) {
        const firstBookTitle = opts.input.cart_items[0].book_title;
        const book = await tx.book.findFirst({
          where: {
            title: firstBookTitle,
            deleted_at: null,
          },
          include: {
            publisher: {
              include: {
                tenant: true,
              },
            },
          },
        });

        if (book?.publisher_id) {
          publisherId = book.publisher_id;
          tenantSlug = book.publisher?.tenant?.slug ?? null;
        }
      }

      // Create the user
      const user = await tx.user.create({
        data: {
          username: opts.input.customer_data.username ?? "",
          email: opts.input.customer_data.email ?? "",
          password: opts.input.customer_data.password
            ? bcrypt.hashSync(opts.input.customer_data.password, 10)
            : "",
          phone_number: opts.input.customer_data.phone_number ?? "",
          first_name: opts.input.customer_data.first_name ?? "",
          last_name: opts.input.customer_data.last_name ?? "",
        },
      });

      // Create the customer
      const customer = await tx.customer.create({
        data: {
          author_id: opts.input.customer_data.author_id ?? null,
          publisher_id: publisherId,
          user_id: user.id,
        },
      });

      // Ensure the "customer" role exists
      const customerRole = await tx.role.findUnique({
        where: { name: "customer" },
      });

      if (!customerRole) {
        throw new Error('Default "customer" role not found. Please run the seed script.');
      }

      // Create a claim with the "customer" role and tenant_slug
      await tx.claim.create({
        data: {
          user_id: user.id,
          role_name: customerRole.name,
          active: true,
          type: "ROLE",
          tenant_slug: tenantSlug,
        },
      });

      // Transfer cart items from localStorage to database
      const createdCartItems = [];
      for (const cartItem of opts.input.cart_items) {
        const cart = await tx.cart.create({
          data: {
            book_image: cartItem.book_image,
            book_title: cartItem.book_title,
            book_type: cartItem.book_type,
            price: cartItem.price,
            quantity: cartItem.quantity ?? 1,
            total: cartItem.total,
            userId: user.id,
          },
        });
        createdCartItems.push(cart);
      }

      return {
        customer,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
        cart_items: createdCartItems,
      };
    });
  });

export const getCustomersByUser = publicProcedure.input(findBookByIdSchema).query(async (opts) => {
  const user = await prisma.user.findUnique({
    where: { id: opts.input.id },
    include: { author: true, publisher: true, customer: true }
  });

  if (!user) {
    return [];
  }

  // If user is a customer, get customers from the same publisher
  if (user.customer && user.customer.publisher_id) {
    return await prisma.customer.findMany({
      where: { publisher_id: user.customer.publisher_id, deleted_at: null },
      include: { 
        user: true,
        purchased_books: true, 
        author: true, 
        publisher: true 
      }
    });
  }

  // If user is a publisher, get customers for that publisher
  if (user.publisher) {
    return await prisma.customer.findMany({
      where: { publisher_id: user.publisher.id, deleted_at: null },
      include: { 
        user: true,
        purchased_books: true, 
        author: true 
      }
    });
  }

  // If user is an author, get customers for that author
  if (user.author) {
    return await prisma.customer.findMany({
      where: { author_id: user.author.id, deleted_at: null },
      include: { 
        user: true,
        author: true, 
        purchased_books: true, 
        publisher: true 
      }
    });
  }

  // Return empty array if user is neither customer, publisher nor author
  return [];
});
