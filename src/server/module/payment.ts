import prisma from "@/lib/prisma";
import { z } from "zod";
import { publicProcedure } from "@/server/trpc";
import {
  initializePaymentSchema,
  verifyPaymentSchema,
  createTransactionSchema,
} from "../dtos";
import axios from "axios";

// Paystack API configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || "";
const PAYSTACK_BASE_URL = "https://api.paystack.co";

// Initialize Paystack payment
export const initializePayment = publicProcedure
  .input(initializePaymentSchema)
  .mutation(async (opts) => {
    const { order_id, email, amount, currency, callback_url } = opts.input;

    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: { customer: { include: { user: true } } },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.payment_status !== "pending") {
      throw new Error(`Order payment status is ${order.payment_status}, cannot initialize payment`);
    }

    // Convert amount to kobo (Paystack uses kobo for NGN)
    const amountInKobo = Math.round(amount * 100);

    try {
      // Initialize Paystack transaction
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          email,
          amount: amountInKobo,
          currency: currency || "NGN",
          reference: `order_${order.order_number}_${Date.now()}`,
          callback_url: callback_url || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/verify?order_id=${order_id}`,
          metadata: {
            order_id: order.id,
            order_number: order.order_number,
            customer_id: order.customer_id,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const { data } = response.data;

      // Create transaction history entry
      await (prisma as any).transactionHistory.create({
        data: {
          order_id: order.id,
          type: "authorization",
          amount: amount,
          currency: currency || "NGN",
          payment_provider: "paystack",
          provider_reference: data.reference,
          status: "pending",
          processor_response: response.data,
        },
      });

      return {
        authorization_url: data.authorization_url,
        access_code: data.access_code,
        reference: data.reference,
      };
    } catch (error: any) {
      console.error("Paystack initialization error:", error);
      throw new Error(
        error.response?.data?.message || "Failed to initialize payment"
      );
    }
  });

// Verify Paystack payment
export const verifyPayment = publicProcedure
  .input(verifyPaymentSchema)
  .mutation(async (opts) => {
    const { reference, order_id } = opts.input;

    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: {
        line_items: {
          include: {
            book_variant: {
              include: { book: true }
            }
          }
        },
        publisher: { include: { tenant: true } },
        customer: { include: { user: true } },
      }
    });

    if (!order) throw new Error("Order not found");

    try {
      const response = await axios.get(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      });

      const { data } = response.data;

      if (data.status === "success") {
        return await prisma.$transaction(async (tx) => {
          
          // 1. Resolve User Identity
          // Check both the linked customer and the potential fallback field
          const userId = order.customer?.user_id || (order as any).user_id || (order as any).userId; 
          
          if (!userId) {
            throw new Error("Could not resolve a User for this order.");
          }

          const tenantSlug = order.publisher?.tenant?.slug;
          const publisherId = order.publisher_id;
          const primaryAuthorId = order.line_items[0]?.book_variant?.book?.author_id;

          // 2. THE "CUSTOMER PROMOTION"
          let customer = await tx.customer.findFirst({
            where: { user_id: userId, publisher_id: publisherId }
          });

          if (!customer) {
            customer = await tx.customer.create({
              data: {
                user_id: userId,
                publisher_id: publisherId,
                author_id: primaryAuthorId,
                name: order.customer?.user?.first_name 
                      ? `${order.customer.user.first_name} ${order.customer.user.last_name || ""}` 
                      : "New Customer",
              }
            });

            // 3. ASSIGN ROLE CLAIM (Avoid duplicates)
            const customerRole = await tx.role.findUnique({ where: { name: "customer" } });
            if (customerRole && tenantSlug) {
              // Only create claim if they don't already have a role for this specific tenant
              const existingClaim = await tx.claim.findFirst({
                where: { user_id: userId, role_name: "customer", tenant_slug: tenantSlug }
              });

              if (!existingClaim) {
                await tx.claim.create({
                  data: {
                    user_id: userId,
                    role_name: customerRole.name,
                    active: true,
                    type: "ROLE",
                    tenant_slug: tenantSlug,
                  },
                });
              }
            }
          } else if (primaryAuthorId && !customer.author_id) {
            await tx.customer.update({
              where: { id: customer.id },
              data: { author_id: primaryAuthorId }
            });
          }

          // 4. Update Order Status
          await tx.order.update({
            where: { id: order.id },
            data: {
              payment_status: "captured",
              status: "paid",
              customer_id: customer.id // Link the order to the customer record
            },
          });

          return { success: true, orderId: order.id };
        });
      }
      return { success: false, message: "Payment verification failed at gateway" };
    } catch (error: any) {
      // LOG THE REAL ERROR so you can see it in your terminal
      console.error("PAYMENT_VERIFICATION_ERROR:", error);
      throw new Error(error.message || "Failed to verify payment");
    }
  });

  
// Create transaction manually (for admin or webhook)
export const createTransaction = publicProcedure
  .input(createTransactionSchema)
  .mutation(async (opts) => {
    const {
      order_id,
      type,
      amount,
      currency,
      payment_provider,
      provider_reference,
      status,
      processor_response,
    } = opts.input;

    return await (prisma as any).transactionHistory.create({
      data: {
        order_id,
        type,
        amount,
        currency,
        payment_provider,
        provider_reference,
        status,
        processor_response,
      },
    });
  });

// Get transactions by order
export const getTransactionsByOrder = publicProcedure
  .input(z.object({ order_id: z.string() }))
  .query(async (opts) => {
    return await (prisma as any).transactionHistory.findMany({
      where: { order_id: opts.input.order_id },
      orderBy: { created_at: "desc" },
    });
  });

