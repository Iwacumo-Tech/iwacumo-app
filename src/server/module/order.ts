import prisma from "@/lib/prisma";
import { z } from "zod";
import { publicProcedure } from "@/server/trpc";
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

  // Try exact match first
  if (typeMap[bookType]) {
    return typeMap[bookType];
  }

  // Try case-insensitive match
  const lowerBookType = bookType.toLowerCase().trim();
  for (const [key, value] of Object.entries(typeMap)) {
    if (key.toLowerCase() === lowerBookType) {
      return value;
    }
  }

  // Fallback: normalize the input
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
      tax_amount,
      shipping_amount,
      discount_amount,
      currency,
      channel,
      notes,
      delivery_address,
      requires_delivery,
    } = opts.input;

    // Get user and ensure customer exists
    const user = await prisma.user.findUnique({
      where: { id: user_id },
      include: { customer: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get or create customer
    let customer = user.customer;
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          user_id: user.id,
          name: `${user.first_name} ${user.last_name || ""}`.trim() || user.email,
        },
      });
    }

    // Get all cart items for the user
    const cartItems = await prisma.cart.findMany({
      where: {
        userId: user_id,
        deleted_at: null,
      },
    });

    if (cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    // Process cart items and find corresponding book variants
    const orderLineItemsData: Array<{
      book_variant_id: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }> = [];

    let subtotal = 0;
    const errors: string[] = [];

    for (const cartItem of cartItems) {
      // Find book by title
      const book = await prisma.book.findFirst({
        where: {
          title: cartItem.book_title,
          deleted_at: null,
        },
        include: {
          variants: true,
          publisher: true,
        },
      });

      if (!book) {
        errors.push(`Book "${cartItem.book_title}" not found`);
        continue;
      }

      // Map cart book_type to variant format
      const variantFormat = mapBookTypeToFormat(cartItem.book_type);

      // Find matching variant - try multiple matching strategies
      let variant = book.variants.find(
        (v) => v.format.toLowerCase() === variantFormat.toLowerCase()
      );

      // If not found, try more flexible matching
      if (!variant) {
        // Try matching without spaces/hyphens
        const normalizedFormat = variantFormat.replace(/[\s-]/g, "").toLowerCase();
        variant = book.variants.find(
          (v) => v.format.replace(/[\s-]/g, "").toLowerCase() === normalizedFormat
        );
      }

      // If still not found, try partial matching
      if (!variant) {
        variant = book.variants.find(
          (v) => 
            v.format.toLowerCase().includes(variantFormat.toLowerCase()) ||
            variantFormat.toLowerCase().includes(v.format.toLowerCase())
        );
      }

      // If variant still doesn't exist, create it automatically using cart price
      if (!variant) {
        // Auto-create variant using the price from cart
        const cartPrice = cartItem.price;
        variant = await (prisma as any).bookVariant.create({
          data: {
            book_id: book.id,
            format: variantFormat,
            list_price: cartPrice,
            currency: "NGN",
            stock_quantity: 0, // Not tracking stock
            status: "active",
          },
        });
      }

      // At this point, variant should always exist
      if (!variant) {
        errors.push(
          `Failed to create or find variant "${variantFormat}" for book "${cartItem.book_title}"`
        );
        continue;
      }

      // Stock checking removed - not tracking stock for now

      // Use variant price (discount_price if available, otherwise list_price)
      const unitPrice = variant.discount_price ?? variant.list_price;
      const quantity = cartItem.quantity || 1;
      const totalPrice = unitPrice * quantity;

      orderLineItemsData.push({
        book_variant_id: variant.id,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      });

      subtotal += totalPrice;
    }

    if (errors.length > 0) {
      throw new Error(`Order creation failed:\n${errors.join("\n")}`);
    }

    if (orderLineItemsData.length === 0) {
      throw new Error("No valid items found in cart");
    }

    // Calculate totals
    const totalAmount = subtotal + tax_amount + shipping_amount - discount_amount;

    // Get publisher_id from first book (assuming all books in cart are from same publisher)
    // In a multi-publisher scenario, you might need to handle this differently
    const firstBook = await prisma.book.findFirst({
      where: {
        title: cartItems[0]?.book_title,
        deleted_at: null,
      },
    });

    // Generate unique order number
    let orderNumber = generateOrderNumber();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.order.findUnique({
        where: { order_number: orderNumber },
      });
      if (!existing) break;
      orderNumber = generateOrderNumber();
      attempts++;
    }

    if (attempts >= 10) {
      throw new Error("Failed to generate unique order number");
    }

    // Prepare order notes with delivery information if provided
    let orderNotes = notes || null;
    if (requires_delivery && delivery_address) {
      const deliveryInfo = {
        delivery_address: delivery_address,
        delivery_required: true,
        requires_physical_delivery: true,
      };
      orderNotes = JSON.stringify(deliveryInfo);
    }

    // Create order with line items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          order_number: orderNumber,
          customer_id: customer.id,
          publisher_id: firstBook?.publisher_id || null,
          total_amount: totalAmount,
          currency,
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

      // Create order line items and update stock
      for (const itemData of orderLineItemsData) {
        // Create order line item
        await (tx as any).orderLineItem.create({
          data: {
            order_id: newOrder.id,
            book_variant_id: itemData.book_variant_id,
            quantity: itemData.quantity,
            unit_price: itemData.unit_price,
            currency,
            total_price: itemData.total_price,
            fulfillment_status: "unfulfilled",
          },
        });

        // Stock decrement removed - not tracking stock for now
        // await (tx as any).bookVariant.update({
        //   where: { id: itemData.book_variant_id },
        //   data: {
        //     stock_quantity: {
        //       decrement: itemData.quantity,
        //     },
        //   },
        // });
      }

      // Soft delete cart items (mark as deleted)
      await tx.cart.updateMany({
        where: {
          userId: user_id,
          deleted_at: null,
        },
        data: {
          deleted_at: new Date(),
        },
      });

      return newOrder;
    });

    // Return order with line items
    return await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        line_items: {
          include: {
            book_variant: {
              include: {
                book: true,
              },
            },
          },
        },
        customer: {
          include: {
            user: true,
          },
        },
        publisher: true,
      },
    });
  });

// Get order by ID
export const getOrderById = publicProcedure
  .input(getOrderByIdSchema)
  .query(async (opts) => {
    return await prisma.order.findUnique({
      where: { id: opts.input.id },
      include: {
        line_items: {
          include: {
            book_variant: {
              include: {
                book: {
                  include: {
                    publisher: true,
                    primary_author: true,
                  },
                },
              },
            },
          },
        },
        customer: {
          include: {
            user: true,
          },
        },
        publisher: true,
        transactions: {
          orderBy: { created_at: "desc" },
        },
        deliveries: {
          orderBy: { created_at: "desc" },
        },
      },
    });
  });

// Get orders by customer
export const getOrdersByCustomer = publicProcedure
  .input(getOrdersByCustomerSchema)
  .query(async (opts) => {
    return await prisma.order.findMany({
      where: { customer_id: opts.input.customer_id },
      include: {
        line_items: {
          include: {
            book_variant: {
              include: {
                book: true,
              },
            },
          },
        },
        publisher: true,
        transactions: {
          orderBy: { created_at: "desc" },
          take: 1, // Get latest transaction
        },
        deliveries: {
          orderBy: { created_at: "desc" },
          take: 1, // Get latest delivery
        },
      },
      orderBy: { created_at: "desc" },
    });
  });

// Get orders by user ID (convenience method)
export const getOrdersByUser = publicProcedure
  .input(z.object({ user_id: z.string() }))
  .query(async (opts) => {
    // Find customer for user
    const customer = await prisma.customer.findUnique({
      where: { user_id: opts.input.user_id },
    });

    if (!customer) {
      return [];
    }

    return await prisma.order.findMany({
      where: { customer_id: customer.id },
      include: {
        line_items: {
          include: {
            book_variant: {
              include: {
                book: true,
              },
            },
          },
        },
        publisher: true,
        transactions: {
          orderBy: { created_at: "desc" },
          take: 1,
        },
        deliveries: {
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
      orderBy: { created_at: "desc" },
    });
  });

// Get all deliveries for a customer by user ID
export const getDeliveriesByCustomer = publicProcedure
  .input(z.object({ user_id: z.string() }))
  .query(async (opts) => {
    // Find customer for user
    const customer = await prisma.customer.findUnique({
      where: { user_id: opts.input.user_id },
    });

    if (!customer) {
      return [];
    }

    // Get all orders for this customer
    const orders = await prisma.order.findMany({
      where: { customer_id: customer.id },
      select: { id: true },
    });

    const orderIds = orders.map((order) => order.id);

    // Get all deliveries for these orders
    return await prisma.deliveryTracking.findMany({
      where: {
        order_id: { in: orderIds },
      },
      include: {
        order: {
          include: {
            line_items: {
              include: {
                book_variant: {
                  include: {
                    book: {
                      select: {
                        id: true,
                        title: true,
                        book_cover: true,
                        cover_image_url: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        order_lineitem: {
          include: {
            book_variant: {
              include: {
                book: {
                  select: {
                    id: true,
                    title: true,
                    book_cover: true,
                    cover_image_url: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });
  });

// Update order status
export const updateOrderStatus = publicProcedure
  .input(updateOrderStatusSchema)
  .mutation(async (opts) => {
    const { id, status, payment_status } = opts.input;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (payment_status) updateData.payment_status = payment_status;

    return await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        line_items: {
          include: {
            book_variant: {
              include: {
                book: true,
              },
            },
          },
        },
        customer: {
          include: {
            user: true,
          },
        },
        publisher: true,
      },
    });
  });

// Cancel order
export const cancelOrder = publicProcedure
  .input(cancelOrderSchema)
  .mutation(async (opts) => {
    const { id, reason } = opts.input;

    return await prisma.$transaction(async (tx) => {
      // Get order with line items
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          line_items: true,
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.status === "cancelled" || order.status === "refunded") {
        throw new Error("Order is already cancelled or refunded");
      }

      // Stock restoration removed - not tracking stock for now
      // for (const lineItem of order.line_items) {
      //   await (tx as any).bookVariant.update({
      //     where: { id: lineItem.book_variant_id },
      //     data: {
      //       stock_quantity: {
      //         increment: lineItem.quantity,
      //       },
      //     },
      //   });
      // }

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: "cancelled",
          notes: reason
            ? `${order.notes || ""}\n[Cancelled]: ${reason}`.trim()
            : order.notes,
        },
        include: {
          line_items: {
            include: {
              book_variant: {
                include: {
                  book: true,
                },
              },
            },
          },
          customer: {
            include: {
              user: true,
            },
          },
          publisher: true,
        },
      });

      return updatedOrder;
    });
  });

// Get all orders (admin function)
// Get orders that need shipping (paid orders with physical items that don't have deliveries yet)
export const getOrdersNeedingShipping = publicProcedure
  .input(getOrdersNeedingShippingSchema)
  .query(async (opts) => {
    // Get all paid orders
    const paidOrders = await prisma.order.findMany({
      where: {
        payment_status: "captured",
        publisher_id: opts.input.publisher_id || undefined,
      },
      include: {
        line_items: {
          include: {
            book_variant: {
              include: {
                book: true,
              },
            },
          },
        },
        customer: {
          include: {
            user: true,
          },
        },
        publisher: true,
        deliveries: true,
      },
      orderBy: { created_at: "desc" },
    });

    // Filter orders that:
    // 1. Have physical items (paperback or hardcover)
    // 2. Don't have delivery tracking yet, or have pending deliveries
    return paidOrders.filter((order) => {
      // Check if order has physical items
      const hasPhysicalItems = order.line_items.some((item) => {
        const format = item.book_variant.format.toLowerCase();
        return format === "paperback" || format === "hardcover";
      });

      if (!hasPhysicalItems) return false;

      // Check if order needs shipping (no deliveries or all deliveries are pending/failed)
      const hasActiveDeliveries = order.deliveries.some(
        (delivery) => delivery.status !== "pending" && delivery.status !== "failed"
      );

      return !hasActiveDeliveries || order.deliveries.length === 0;
    });
  });

// Get deliveries for a specific order
export const getDeliveriesByOrder = publicProcedure
  .input(getDeliveriesByOrderSchema)
  .query(async (opts) => {
    return await prisma.deliveryTracking.findMany({
      where: { order_id: opts.input.order_id },
      include: {
        order: {
          include: {
            customer: {
              include: {
                user: true,
              },
            },
            line_items: {
              include: {
                book_variant: {
                  include: {
                    book: {
                      select: {
                        id: true,
                        title: true,
                        book_cover: true,
                        cover_image_url: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        order_lineitem: {
          include: {
            book_variant: {
              include: {
                book: {
                  select: {
                    id: true,
                    title: true,
                    book_cover: true,
                    cover_image_url: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });
  });

// Create delivery tracking
export const createDeliveryTracking = publicProcedure
  .input(createDeliveryTrackingSchema)
  .mutation(async (opts) => {
    // Verify order exists and is paid
    const order = await prisma.order.findUnique({
      where: { id: opts.input.order_id },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.payment_status !== "captured") {
      throw new Error("Order must be paid before creating delivery tracking");
    }

    // Check if tracking number already exists
    const existingTracking = await prisma.deliveryTracking.findUnique({
      where: { tracking_number: opts.input.tracking_number },
    });

    if (existingTracking) {
      throw new Error("Tracking number already exists");
    }

    // Create delivery tracking
    const delivery = await prisma.deliveryTracking.create({
      data: {
        order_id: opts.input.order_id,
        order_lineitem_id: opts.input.order_lineitem_id && opts.input.order_lineitem_id !== "none" 
          ? opts.input.order_lineitem_id 
          : null,
        carrier: opts.input.carrier,
        service_level: opts.input.service_level || null,
        tracking_number: opts.input.tracking_number,
        tracking_url: opts.input.tracking_url || null,
        estimated_delivery_at: opts.input.estimated_delivery_at || null,
        status: opts.input.status,
      },
      include: {
        order: true,
        order_lineitem: {
          include: {
            book_variant: {
              include: {
                book: true,
              },
            },
          },
        },
      },
    });

    // Update order line item fulfillment status if provided
    if (opts.input.order_lineitem_id) {
      await (prisma as any).orderLineItem.update({
        where: { id: opts.input.order_lineitem_id },
        data: { fulfillment_status: "in_progress" },
      });
    }

    // Update order status to "fulfilled" if not already
    if (order.status !== "fulfilled") {
      await prisma.order.update({
        where: { id: opts.input.order_id },
        data: { status: "fulfilled" },
      });
    }

    return delivery;
  });

// Update delivery tracking
export const updateDeliveryTracking = publicProcedure
  .input(updateDeliveryTrackingSchema)
  .mutation(async (opts) => {
    const { id, ...updateData } = opts.input;

    // If tracking number is being updated, check for duplicates
    if (updateData.tracking_number) {
      const existing = await prisma.deliveryTracking.findUnique({
        where: { tracking_number: updateData.tracking_number },
      });

      if (existing && existing.id !== id) {
        throw new Error("Tracking number already exists");
      }
    }

    // Prepare update data
    const data: any = {};
    if (updateData.carrier) data.carrier = updateData.carrier;
    if (updateData.service_level !== undefined) data.service_level = updateData.service_level;
    if (updateData.tracking_number) data.tracking_number = updateData.tracking_number;
    if (updateData.tracking_url !== undefined) data.tracking_url = updateData.tracking_url || null;
    if (updateData.estimated_delivery_at) data.estimated_delivery_at = updateData.estimated_delivery_at;
    if (updateData.shipped_at) data.shipped_at = updateData.shipped_at;
    if (updateData.delivered_at) data.delivered_at = updateData.delivered_at;
    if (updateData.status) data.status = updateData.status;
    if (updateData.proof_of_delivery) data.proof_of_delivery = updateData.proof_of_delivery;

    // Auto-update shipped_at when status changes to in_transit or out_for_delivery
    if (updateData.status === "in_transit" || updateData.status === "out_for_delivery") {
      const delivery = await prisma.deliveryTracking.findUnique({ where: { id } });
      if (delivery && !delivery.shipped_at) {
        data.shipped_at = new Date();
      }
    }

    // Auto-update delivered_at when status changes to delivered
    if (updateData.status === "delivered") {
      const delivery = await prisma.deliveryTracking.findUnique({ where: { id } });
      if (delivery && !delivery.delivered_at) {
        data.delivered_at = new Date();
      }
    }

    const updated = await prisma.deliveryTracking.update({
      where: { id },
      data,
      include: {
        order: {
          include: {
            line_items: true,
          },
        },
        order_lineitem: {
          include: {
            book_variant: {
              include: {
                book: true,
              },
            },
          },
        },
      },
    });

    // Update order line item fulfillment status based on delivery status
    if (updated.order_lineitem_id) {
      let fulfillmentStatus = "in_progress";
      if (updateData.status === "delivered") {
        fulfillmentStatus = "delivered";
      } else if (updateData.status === "in_transit" || updateData.status === "out_for_delivery") {
        fulfillmentStatus = "shipped";
      }

      await (prisma as any).orderLineItem.update({
        where: { id: updated.order_lineitem_id },
        data: { fulfillment_status: fulfillmentStatus },
      });
    }

    return updated;
  });

export const getAllOrders = publicProcedure.query(async () => {
  return await prisma.order.findMany({
    include: {
      line_items: {
        include: {
          book_variant: {
            include: {
              book: true,
            },
          },
        },
      },
      customer: {
        include: {
          user: true,
        },
      },
      publisher: true,
      transactions: {
        orderBy: { created_at: "desc" },
        take: 1,
      },
      deliveries: {
        orderBy: { created_at: "desc" },
        // Return all deliveries, not just one
      },
    },
    orderBy: { created_at: "desc" },
  });
});

