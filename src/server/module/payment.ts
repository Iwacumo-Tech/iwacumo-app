import prisma from "@/lib/prisma";
import { z } from "zod";
import { publicProcedure } from "@/server/trpc";
import {
  initializePaymentSchema,
  verifyPaymentSchema,
  createTransactionSchema,
} from "../dtos";
import axios from "axios";
import { getShippingZone } from "@/lib/constants";
import { sendOrderConfirmationEmail } from "@/lib/email";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_BASE_URL   = "https://api.paystack.co";

// ─── initializePayment ────────────────────────────────────────────────────────

export const initializePayment = publicProcedure
  .input(initializePaymentSchema)
  .mutation(async (opts) => {
    const { order_id, email, amount, currency, callback_url } = opts.input;

    const order = await prisma.order.findUnique({
      where:   { id: order_id },
      include: { customer: { include: { user: true } } },
    });
    if (!order) throw new Error("Order not found");
    if (order.payment_status !== "pending")
      throw new Error(`Order payment status is ${order.payment_status}, cannot initialize payment`);

    const amountInKobo = Math.round(amount * 100);

    try {
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          email,
          amount:     amountInKobo,
          currency:   currency || "NGN",
          reference:  `order_${order.order_number}_${Date.now()}`,
          callback_url: callback_url ||
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/verify?order_id=${order_id}`,
          metadata: {
            order_id:     order.id,
            order_number: order.order_number,
            customer_id:  order.customer_id,
          },
        },
        {
          headers: {
            Authorization:  `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const { data } = response.data;

      await prisma.transactionHistory.create({
        data: {
          order_id:           order.id,
          type:               "authorization",
          amount,
          currency:           currency || "NGN",
          payment_provider:   "paystack",
          provider_reference: data.reference,
          status:             "pending",
          processor_response: response.data,
        },
      });

      return {
        authorization_url: data.authorization_url,
        access_code:       data.access_code,
        reference:         data.reference,
      };
    } catch (error: any) {
      console.error("Paystack initialization error:", error);
      throw new Error(error.response?.data?.message || "Failed to initialize payment");
    }
  });

// ─── verifyPayment ────────────────────────────────────────────────────────────

export const verifyPayment = publicProcedure
  .input(verifyPaymentSchema)
  .mutation(async (opts) => {
    const { reference, order_id } = opts.input;

    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: {
        line_items: {
          include: {
            book_variant: { include: { book: true } },
          },
        },
        publisher: { include: { tenant: true } },
        customer:  { include: { user: true } },
      },
    });
    if (!order) throw new Error("Order not found");

    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      );

      const { data } = response.data;

      if (data.status === "success") {
        const result = await prisma.$transaction(async (tx) => {
          // ── 1. Resolve user identity ──────────────────────────────────
          const userId = order.customer?.user_id || (order as any).user_id;
          if (!userId) throw new Error("Could not resolve a User for this order.");

          const tenantSlug      = order.publisher?.tenant?.slug;
          const publisherId     = order.publisher_id;
          const primaryAuthorId = order.line_items[0]?.book_variant?.book?.author_id;

          // ── 2. Customer promotion ─────────────────────────────────────
          let customer = await tx.customer.findFirst({
            where: { user_id: userId, publisher_id: publisherId },
          });

          if (!customer) {
            customer = await tx.customer.create({
              data: {
                user_id:      userId,
                publisher_id: publisherId,
                author_id:    primaryAuthorId,
                name: order.customer?.user?.first_name
                  ? `${order.customer.user.first_name} ${order.customer.user.last_name || ""}`
                  : "New Customer",
              },
            });

            // Assign customer role claim (idempotent)
            const customerRole = await tx.role.findUnique({ where: { name: "customer" } });
            if (customerRole && tenantSlug) {
              const existingClaim = await tx.claim.findFirst({
                where: { user_id: userId, role_name: "customer", tenant_slug: tenantSlug },
              });
              if (!existingClaim) {
                await tx.claim.create({
                  data: {
                    user_id:    userId,
                    role_name:  customerRole.name,
                    active:     true,
                    type:       "ROLE",
                    tenant_slug: tenantSlug,
                  },
                });
              }
            }
          } else if (primaryAuthorId && !customer.author_id) {
            await tx.customer.update({
              where: { id: customer.id },
              data:  { author_id: primaryAuthorId },
            });
          }

          // ── 3. Update transaction history to succeeded ────────────────
          await tx.transactionHistory.updateMany({
            where: { order_id: order.id, status: "pending" },
            data:  { status: "succeeded" },
          });

          // ── 4. Mark order as paid ─────────────────────────────────────
          await tx.order.update({
            where: { id: order.id },
            data: {
              payment_status: "captured",
              status:         "paid",
              customer_id:    customer.id,
            },
          });

          return { success: true, orderId: order.id, customerId: customer.id };
        });

        // ── 5. Send order confirmation email (non-blocking) ──────────────
        // We do this outside the DB transaction so a mail failure never
        // rolls back the payment update.
        void (async () => {
          try {
            const customerUser = order.customer?.user;
            if (!customerUser?.email) return;

            // Parse delivery info from order notes if present
            let deliveryState: string | undefined;
            let shippingZone:  string | undefined;
            if (order.notes) {
              try {
                const parsed = JSON.parse(order.notes);
                if (parsed.delivery_address?.state) {
                  deliveryState = parsed.delivery_address.state
                    .split(" ")
                    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ");
                  shippingZone = getShippingZone(parsed.delivery_address.state);
                }
              } catch { /* notes might not be JSON */ }
            }

            const isDigitalOnly = order.line_items.every(item => {
              const fmt = item.book_variant.format.toLowerCase();
              return fmt !== "paperback" && fmt !== "hardcover";
            });

            await sendOrderConfirmationEmail({
              to:        customerUser.email,
              firstName: customerUser.first_name,
              orderNumber: order.order_number,
              orderDate:   order.created_at,   // set at order creation
              items: order.line_items.map(item => ({
                title:    item.book_variant.book?.title ?? "Book",
                type:     item.book_variant.format,
                quantity: item.quantity,
                price:    item.unit_price,
              })),
              subtotal:      order.subtotal_amount,
              shippingCost:  order.shipping_amount,
              total:         order.total_amount,
              isDigitalOnly,
              deliveryState,
              shippingZone,
            });
          } catch (mailErr) {
            // Log but never throw — payment is already confirmed
            console.error("[verifyPayment] Order confirmation email failed:", mailErr);
          }
        })();

        return result;
      }

      return { success: false, message: "Payment verification failed at gateway" };
    } catch (error: any) {
      console.error("PAYMENT_VERIFICATION_ERROR:", error);
      throw new Error(error.message || "Failed to verify payment");
    }
  });

// ─── createTransaction ────────────────────────────────────────────────────────

export const createTransaction = publicProcedure
  .input(createTransactionSchema)
  .mutation(async (opts) => {
    const {
      order_id, type, amount, currency,
      payment_provider, provider_reference, status, processor_response,
    } = opts.input;

    return await prisma.transactionHistory.create({
      data: {
        order_id, type, amount, currency,
        payment_provider, provider_reference, status, processor_response,
      },
    });
  });

// ─── getTransactionsByOrder ───────────────────────────────────────────────────

export const getTransactionsByOrder = publicProcedure
  .input(z.object({ order_id: z.string() }))
  .query(async (opts) => {
    return await prisma.transactionHistory.findMany({
      where:   { order_id: opts.input.order_id },
      orderBy: { created_at: "desc" },
    });
  });