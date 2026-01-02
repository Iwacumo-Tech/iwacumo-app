import prisma from "@/lib/prisma";
import { z } from "zod";
import { publicProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import {
  createOrderFromCartSchema,
  getOrderByIdSchema,
  getOrdersByCustomerSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  createDeliveryTrackingSchema,
  updateDeliveryTrackingSchema,
  getDeliveriesByOrderSchema,
  getOrdersNeedingShippingSchema,
} from "../dtos";

/**
 * Order Module
 * Location: src/server/module/order.ts
 * * Phase C: Revenue Split Logic & Multi-tenant Business Logic.
 * * This version augments the existing delivery and variant mapping logic.
 */

// Revenue configuration
const PLATFORM_FEE_PERCENT = 10; // 10% Platform fee
const AUTHOR_ROYALTY_DEFAULT = 70; // 70% of the remainder after platform fee

// Helper function to generate unique order number
const generateOrderNumber = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `ORD-${timestamp}-${random}`;
};

// Helper function to map cart book_type to BookVariant format
const mapBookTypeToFormat = (bookType: string): string => {
  const typeMap: Record<string, string> = {
    "Paper-back": "paperback",
    "paperback": "paperback",
    "E-copy": "ebook",
    "ebook": "ebook",
    "e-copy": "ebook",
    "Hard-cover": "hardcover",
    "hardcover": "hardcover",
    "hard-cover": "hardcover",
    "Hard Cover": "hardcover",
    "Hardcover": "hardcover",
    "Audiobook": "audiobook",
    "audiobook": "audiobook",
  };

  if (typeMap[bookType]) return typeMap[bookType];

  const lowerBookType = bookType.toLowerCase().trim();
  for (const [key, value] of Object.entries(typeMap)) {
    if (key.toLowerCase() === lowerBookType) return value;
  }

  return lowerBookType.replace(/\s+/g, "").replace(/-/g, "");
};

// Create order from cart items
export const createOrderFromCart = publicProcedure
  .input(createOrderFromCartSchema)
  .mutation(async (opts) => {
    const {
      user_id,
      shipping_address_id,
      billing_address_id,
      tax_amount = 0,
      shipping_amount = 0,
      discount_amount = 0,
      currency,
      channel,
      notes,
      delivery_address,
      requires_delivery,
    } = opts.input;

    const user = await prisma.user.findUnique({
      where: { id: user_id },
      include: { customer: true },
    });

    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

    let customer = user.customer;
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          user_id: user.id,
          name: `${user.first_name} ${user.last_name || ""}`.trim() || user.email,
        },
      });
    }

    const cartItems = await prisma.cart.findMany({
      where: { userId: user_id, deleted_at: null },
    });

    if (cartItems.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Cart is empty" });

    const orderLineItemsData: Array<{
      book_variant_id: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      platform_fee: number;
      publisher_earnings: number;
      author_earnings: number;
    }> = [];

    let subtotal = 0;
    const errors: string[] = [];

    for (const cartItem of cartItems) {
      const book = await prisma.book.findFirst({
        where: { title: cartItem.book_title, deleted_at: null },
        include: { variants: true, publisher: true },
      });

      if (!book) {
        errors.push(`Book "${cartItem.book_title}" not found`);
        continue;
      }

      const variantFormat = mapBookTypeToFormat(cartItem.book_type);
      let variant = book.variants.find((v) => v.format.toLowerCase() === variantFormat.toLowerCase());

      if (!variant) {
        const normalizedFormat = variantFormat.replace(/[\s-]/g, "").toLowerCase();
        variant = book.variants.find((v) => v.format.replace(/[\s-]/g, "").toLowerCase() === normalizedFormat);
      }

      if (!variant) {
        variant = await (prisma as any).bookVariant.create({
          data: {
            book_id: book.id,
            format: variantFormat,
            list_price: cartItem.price,
            currency: "NGN",
            stock_quantity: 0,
            status: "active",
          },
        });
      }

      const unitPrice = variant!.discount_price ?? variant!.list_price;
      const quantity = cartItem.quantity || 1;
      const totalPrice = unitPrice * quantity;

      // REVENUE SPLIT CALCULATIONS
      const platformFee = (totalPrice * PLATFORM_FEE_PERCENT) / 100;
      const remaining = totalPrice - platformFee;
      const authorEarnings = (remaining * AUTHOR_ROYALTY_DEFAULT) / 100;
      const publisherEarnings = remaining - authorEarnings;

      orderLineItemsData.push({
        book_variant_id: variant!.id,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        platform_fee: platformFee,
        publisher_earnings: publisherEarnings,
        author_earnings: authorEarnings,
      });

      subtotal += totalPrice;
    }

    if (errors.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: errors.join(", ") });

    const totalAmount = subtotal + tax_amount + shipping_amount - discount_amount;

    const firstBook = await prisma.book.findFirst({
      where: { title: cartItems[0]?.book_title, deleted_at: null },
    });

    let orderNumber = generateOrderNumber();
    let orderNotes = notes || null;
    if (requires_delivery && delivery_address) {
      orderNotes = JSON.stringify({ delivery_address, delivery_required: true, requires_physical_delivery: true });
    }

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          order_number: orderNumber,
          customer_id: customer!.id,
          publisher_id: firstBook?.publisher_id || null,
          total_amount: totalAmount,
          currency: currency || "NGN",
          subtotal_amount: subtotal,
          tax_amount,
          shipping_amount,
          discount_amount,
          status: "draft",
          payment_status: "pending",
          channel: channel || "web",
          notes: orderNotes,
          shipping_address_id: shipping_address_id || null,
          billing_address_id: billing_address_id || null,
        },
      });

      for (const itemData of orderLineItemsData) {
        await (tx as any).orderLineItem.create({
          data: {
            order_id: newOrder.id,
            book_variant_id: itemData.book_variant_id,
            quantity: itemData.quantity,
            unit_price: itemData.unit_price,
            currency: currency || "NGN",
            total_price: itemData.total_price,
            platform_fee: itemData.platform_fee,
            publisher_earnings: itemData.publisher_earnings,
            author_earnings: itemData.author_earnings,
            fulfillment_status: "unfulfilled",
          },
        });
      }

      await tx.cart.updateMany({
        where: { userId: user_id, deleted_at: null },
        data: { deleted_at: new Date() },
      });

      return newOrder;
    });

    return await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        line_items: { include: { book_variant: { include: { book: true } } } },
        customer: { include: { user: true } },
        publisher: true,
      },
    });
  });

export const getOrderById = publicProcedure.input(getOrderByIdSchema).query(async (opts) => {
  return await prisma.order.findUnique({
    where: { id: opts.input.id },
    include: {
      line_items: { include: { book_variant: { include: { book: { include: { publisher: true, primary_author: true } } } } } },
      customer: { include: { user: true } },
      publisher: true,
      transactions: { orderBy: { created_at: "desc" } },
      deliveries: { orderBy: { created_at: "desc" } },
    },
  });
});

export const getOrdersByCustomer = publicProcedure.input(getOrdersByCustomerSchema).query(async (opts) => {
  return await prisma.order.findMany({
    where: { customer_id: opts.input.customer_id },
    include: {
      line_items: { include: { book_variant: { include: { book: true } } } },
      publisher: true,
      transactions: { orderBy: { created_at: "desc" }, take: 1 },
      deliveries: { orderBy: { created_at: "desc" }, take: 1 },
    },
    orderBy: { created_at: "desc" },
  });
});

export const getOrdersByUser = publicProcedure.input(z.object({ user_id: z.string() })).query(async (opts) => {
  const customer = await prisma.customer.findUnique({ where: { user_id: opts.input.user_id } });
  if (!customer) return [];
  return await prisma.order.findMany({
    where: { customer_id: customer.id },
    include: {
      line_items: { include: { book_variant: { include: { book: true } } } },
      publisher: true,
      transactions: { orderBy: { created_at: "desc" }, take: 1 },
      deliveries: { orderBy: { created_at: "desc" }, take: 1 },
    },
    orderBy: { created_at: "desc" },
  });
});

export const getDeliveriesByCustomer = publicProcedure.input(z.object({ user_id: z.string() })).query(async (opts) => {
  const customer = await prisma.customer.findUnique({ where: { user_id: opts.input.user_id } });
  if (!customer) return [];
  const orders = await prisma.order.findMany({ where: { customer_id: customer.id }, select: { id: true } });
  const orderIds = orders.map((o) => o.id);

  return await prisma.deliveryTracking.findMany({
    where: { order_id: { in: orderIds } },
    include: {
      order: { include: { line_items: { include: { book_variant: { include: { book: true } } } } } },
      order_lineitem: { include: { book_variant: { include: { book: true } } } },
    },
    orderBy: { created_at: "desc" },
  });
});

export const updateOrderStatus = publicProcedure.input(updateOrderStatusSchema).mutation(async (opts) => {
  const { id, status, payment_status } = opts.input;
  const updateData: any = {};
  if (status) updateData.status = status;
  if (payment_status) updateData.payment_status = payment_status;

  return await prisma.order.update({
    where: { id },
    data: updateData,
    include: {
      line_items: { include: { book_variant: { include: { book: true } } } },
      customer: { include: { user: true } },
      publisher: true,
    },
  });
});

export const cancelOrder = publicProcedure.input(cancelOrderSchema).mutation(async (opts) => {
  const { id, reason } = opts.input;
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { line_items: true } });
    if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
    if (order.status === "cancelled" || order.status === "refunded") throw new TRPCError({ code: "BAD_REQUEST", message: "Already cancelled" });

    return await tx.order.update({
      where: { id },
      data: {
        status: "cancelled",
        notes: reason ? `${order.notes || ""}\n[Cancelled]: ${reason}`.trim() : order.notes,
      },
      include: {
        line_items: { include: { book_variant: { include: { book: true } } } },
        customer: { include: { user: true } },
        publisher: true,
      },
    });
  });
});

export const getOrdersNeedingShipping = publicProcedure.input(getOrdersNeedingShippingSchema).query(async (opts) => {
  const paidOrders = await prisma.order.findMany({
    where: { payment_status: "captured", publisher_id: opts.input.publisher_id || undefined },
    include: {
      line_items: { include: { book_variant: { include: { book: true } } } },
      customer: { include: { user: true } },
      publisher: true,
      deliveries: true,
    },
    orderBy: { created_at: "desc" },
  });

  return paidOrders.filter((order) => {
    const hasPhysicalItems = order.line_items.some((item) => {
      const format = item.book_variant.format.toLowerCase();
      return format === "paperback" || format === "hardcover";
    });
    if (!hasPhysicalItems) return false;
    const hasActiveDeliveries = order.deliveries.some((d) => d.status !== "pending" && d.status !== "failed");
    return !hasActiveDeliveries || order.deliveries.length === 0;
  });
});

export const getDeliveriesByOrder = publicProcedure.input(getDeliveriesByOrderSchema).query(async (opts) => {
  return await prisma.deliveryTracking.findMany({
    where: { order_id: opts.input.order_id },
    include: {
      order: { include: { customer: { include: { user: true } }, line_items: { include: { book_variant: { include: { book: true } } } } } },
      order_lineitem: { include: { book_variant: { include: { book: true } } } },
    },
    orderBy: { created_at: "desc" },
  });
});

export const createDeliveryTracking = publicProcedure.input(createDeliveryTrackingSchema).mutation(async (opts) => {
  const order = await prisma.order.findUnique({ where: { id: opts.input.order_id } });
  if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
  if (order.payment_status !== "captured") throw new TRPCError({ code: "BAD_REQUEST", message: "Order not paid" });

  const delivery = await prisma.deliveryTracking.create({
    data: {
      order_id: opts.input.order_id,
      order_lineitem_id: opts.input.order_lineitem_id !== "none" ? opts.input.order_lineitem_id : null,
      carrier: opts.input.carrier,
      service_level: opts.input.service_level || null,
      tracking_number: opts.input.tracking_number,
      tracking_url: opts.input.tracking_url || null,
      estimated_delivery_at: opts.input.estimated_delivery_at || null,
      status: opts.input.status,
    },
    include: { order: true, order_lineitem: { include: { book_variant: { include: { book: true } } } } },
  });

  if (opts.input.order_lineitem_id) {
    await (prisma as any).orderLineItem.update({ where: { id: opts.input.order_lineitem_id }, data: { fulfillment_status: "in_progress" } });
  }

  if (order.status !== "fulfilled") {
    await prisma.order.update({ where: { id: opts.input.order_id }, data: { status: "fulfilled" } });
  }

  return delivery;
});

export const updateDeliveryTracking = publicProcedure.input(updateDeliveryTrackingSchema).mutation(async (opts) => {
  const { id, ...updateData } = opts.input;
  const data: any = { ...updateData };
  
  if (updateData.status === "delivered") data.delivered_at = new Date();
  if (updateData.status === "in_transit" || updateData.status === "out_for_delivery") data.shipped_at = new Date();

  const updated = await prisma.deliveryTracking.update({
    where: { id },
    data,
    include: { order: { include: { line_items: true } }, order_lineitem: { include: { book_variant: { include: { book: true } } } } },
  });

  if (updated.order_lineitem_id) {
    let fStatus = "in_progress";
    if (updateData.status === "delivered") fStatus = "delivered";
    else if (["in_transit", "out_for_delivery"].includes(updateData.status || "")) fStatus = "shipped";
    
    await (prisma as any).orderLineItem.update({ where: { id: updated.order_lineitem_id }, data: { fulfillment_status: fStatus } });
  }

  return updated;
});

export const getAllOrders = publicProcedure.query(async () => {
  return await prisma.order.findMany({
    include: {
      line_items: { include: { book_variant: { include: { book: true } } } },
      customer: { include: { user: true } },
      publisher: true,
      transactions: { orderBy: { created_at: "desc" }, take: 1 },
      deliveries: { orderBy: { created_at: "desc" } },
    },
    orderBy: { created_at: "desc" },
  });
});

// Added for Phase C: Financial Reporting
export const getEarningsReport = publicProcedure.input(z.object({ publisher_id: z.string().optional(), author_id: z.string().optional() })).query(async ({ input }) => {
  const where: any = {};
  if (input.publisher_id) where.book_variant = { book: { publisher_id: input.publisher_id } };
  if (input.author_id) where.book_variant = { book: { author_id: input.author_id } };

  const lineItems = await prisma.orderLineItem.findMany({
    where: { ...where, order: { payment_status: "captured" } },
    select: { publisher_earnings: true, author_earnings: true, platform_fee: true, total_price: true }
  });

  return {
    total_sales: lineItems.reduce((acc, curr) => acc + curr.total_price, 0),
    author_total: lineItems.reduce((acc, curr) => acc + (curr.author_earnings || 0), 0),
    publisher_total: lineItems.reduce((acc, curr) => acc + (curr.publisher_earnings || 0), 0),
    platform_total: lineItems.reduce((acc, curr) => acc + (curr.platform_fee || 0), 0),
  };
});