import prisma from "@/lib/prisma";
import { createCustomerSchema, updateCustomerSchema, deleteCustomerSchema, findBookByIdSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const createCustomer = publicProcedure
  .input(createCustomerSchema)
  .mutation(async (opts) => {
    const { username, email, password, phone_number, first_name, last_name, author_id, publisher_id } = opts.input;

    // 1. Pre-emptive Uniqueness Check for "Pure English" errors
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email: email ?? "" }] }
    });

    if (existingUser) {
      const field = existingUser.email === email ? "Email" : "Username";
      throw new TRPCError({
        code: "CONFLICT",
        message: `${field} is already taken. Please try another.`
      });
    }

    // 2. Safe Password Hashing (Outside Transaction)
    const hashedPassword = password ? bcrypt.hashSync(password, 10) : "";

    return await prisma.$transaction(async (tx) => {
      // 3. Create the Core User
      const user = await tx.user.create({
        data: {
          username,
          email: email ?? "",
          password: hashedPassword,
          phone_number: phone_number ?? "",
          first_name: first_name ?? "",
          last_name: last_name ?? ""
        }
      });

      // 4. Resolve the Organization Identity (tenant_slug)
      let tenantSlug: string | null = null;
      if (publisher_id) {
        const publisher = await tx.publisher.findUnique({
          where: { id: publisher_id },
          select: { slug: true }
        });
        tenantSlug = publisher?.slug ?? null;
      }

      // 5. Create the Customer Record (Linking Author & Publisher)
      const customer = await tx.customer.create({
        data: {
          user_id: user.id,
          publisher_id: publisher_id ?? null,
          author_id: author_id ?? null, // Allows author-specific filtering
        },
      });

      // 6. Assign the "Customer" Role & Permission Claims
      const customerRole = await tx.role.findUnique({ where: { name: "customer" } });
      if (!customerRole) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Customer role not found in system." });

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
    }, {
      timeout: 10000 // Prevent "Transaction already closed" errors
    });
  });

// export const updateCustomer = publicProcedure.input(createCustomerSchema).mutation(async (opts) => {
//   return await prisma.$transaction(async (tx) => {
//     // Get the customer to find the user_id
//     const customer = await tx.customer.findUnique({
//       where: { id: opts.input.id },
//     });

//     if (!customer) {
//       throw new Error("Customer not found");
//     }

//     // Update the user's information if provided
//     if (opts.input.first_name !== undefined || opts.input.last_name !== undefined || 
//         opts.input.email !== undefined || opts.input.phone_number !== undefined || 
//         opts.input.username !== undefined) {
//       await tx.user.update({
//         where: { id: customer.user_id },
//         data: {
//           ...(opts.input.first_name !== undefined && { first_name: opts.input.first_name }),
//           ...(opts.input.last_name !== undefined && { last_name: opts.input.last_name }),
//           ...(opts.input.email !== undefined && { email: opts.input.email }),
//           ...(opts.input.phone_number !== undefined && { phone_number: opts.input.phone_number }),
//           ...(opts.input.username !== undefined && { username: opts.input.username }),
//         },
//       });
//     }

//     // Update the customer
//     return await tx.customer.update({
//       where: { id: opts.input.id },
//       data: {
//         author_id: opts.input.author_id,
//         publisher_id: opts.input.publisher_id,
//       },
//     });
//   });
// });

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
      
      // 1. CREATE THE USER ONLY (Identity)
      // We no longer create the 'Customer' record here to avoid cluttering 
      // publisher dashboards with unpaid leads.
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

      // 2. TRANSFER CART ITEMS
      // We link these directly to the User ID. 
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
            userId: user.id, // Linking to the new global Identity
          },
        });
        createdCartItems.push(cart);
      }

      // We return the user info so the frontend can log them in, 
      // but they do not have a 'customer' role or tenant_slug yet.
      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
        cart_items: createdCartItems,
      };
    });
  });

export const getCustomersByUser = publicProcedure
  .input(z.object({ id: z.string() })) // Simplified input
  .query(async (opts) => {
    const user = await prisma.user.findUnique({
      where: { id: opts.input.id },
      include: { author: true, publisher: true, customers: true, claims: true }
    });

    if (!user) return [];

    // 1. CHECK FOR SUPER-ADMIN ROLE
    const isSuperAdmin = user.claims.some(c => c.role_name === "super-admin" && c.active);

    if (isSuperAdmin) {
      // God-mode: All customers across all publishers
      return await prisma.customer.findMany({
        where: { deleted_at: null },
        include: { 
          user: true, 
          purchased_books: true, 
          author: true, 
          publisher: true 
        }
      });
    }

    // --- LOGIC FOR PUBLISHERS ---
    if (user.publisher) {
      return await prisma.customer.findMany({
        where: { publisher_id: user.publisher.id, deleted_at: null },
        include: { user: true, purchased_books: true, author: true }
      });
    }

    // --- LOGIC FOR AUTHORS ---
    if (user.author) {
      return await prisma.customer.findMany({
        where: { author_id: user.author.id, deleted_at: null },
        include: { user: true, author: true, purchased_books: true, publisher: true }
      });
    }

    // --- LOGIC FOR CUSTOMERS/READERS ---
    if (user.customers && user.customers.length > 0) {
      const primaryPublisherId = user.customers[0].publisher_id;
      if (primaryPublisherId) {
        return await prisma.customer.findMany({
          where: { publisher_id: primaryPublisherId, deleted_at: null },
          include: { user: true, purchased_books: true, author: true, publisher: true }
        });
      }
    }

    return [];
  });

  
/**
 * Customer Dashboard Analytics
 * Provides high-level metrics for the Reader/Customer view.
 */
export const getCustomerDashboardStats = publicProcedure
  .input(z.object({ user_id: z.string() }))
  .query(async ({ input }) => {
    // 1. Fetch ALL customer profiles with their captured orders and line items
    const customerProfiles = await prisma.customer.findMany({
      where: { user_id: input.user_id },
      include: {
        orders: {
          where: { payment_status: "captured" },
          orderBy: { created_at: "desc" },
          include: { 
            line_items: { 
              include: { 
                book_variant: { 
                  select: { book_id: true } // We only need the ID to count unique books
                } 
              } 
            } 
          }
        },
        _count: {
          select: { 
            orders: { where: { payment_status: "captured" } },
          }
        }
      }
    });

    if (!customerProfiles.length) return null;

    // 2. Fetch Total Spent (Aggregation)
    const totalSpentAgg = await prisma.order.aggregate({
      where: { 
        customer: { user_id: input.user_id },
        payment_status: "captured" 
      },
      _sum: { total_amount: true }
    });

    // 3. Extract Unique Books and Aggregate Recent Orders
    const uniqueBookIds = new Set<string>();
    let totalPurchases = 0;
    const combinedRecent: any[] = [];

    customerProfiles.forEach(profile => {
      totalPurchases += profile._count.orders;
      
      profile.orders.forEach(order => {
        combinedRecent.push(order);
        
        // Add every book_id from the line items to the Set
        order.line_items.forEach(item => {
          if (item.book_variant?.book_id) {
            uniqueBookIds.add(item.book_variant.book_id);
          }
        });
      });
    });

    // 4. Sort and limit recent orders to the top 5 globally
    const finalRecentOrders = combinedRecent
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    return {
      totalPurchases: totalPurchases,
      booksOwned: uniqueBookIds.size, 
      recentOrders: finalRecentOrders,
      totalSpent: totalSpentAgg._sum.total_amount || 0,
    };
  });

export const updateCustomer = publicProcedure
  .input(updateCustomerSchema)
  .mutation(async ({ input }) => {
    const { id, first_name, last_name, username, email, phone_number } = input;

    // 1. Uniqueness check: Ensure the new username/email isn't taken by someone else
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
        NOT: {
          customers: {
            some: { id: id }
          } // Exclude the customer we are currently editing
        }
      }
    });

    if (existingUser) {
      const field = existingUser.email === email ? "Email" : "Username";
      throw new TRPCError({
        code: "CONFLICT",
        message: `${field} is already in use by another account.`
      });
    }

    // 2. Perform the nested update
    return await prisma.customer.update({
      where: { id },
      data: {
        user: {
          update: {
            first_name,
            last_name,
            username,
            email,
            phone_number: phone_number ?? ""
          }
        }
      },
      include: { user: true }
    });
  });