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

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: order_id },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    try {
      // Verify payment with Paystack
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      const { data } = response.data;

      // Check if payment was successful
      if (data.status === "success" && data.gateway_response === "Successful") {
        // Update authorization transaction
        await (prisma as any).transactionHistory.updateMany({
          where: {
            order_id: order.id,
            provider_reference: reference,
            type: "authorization",
          },
          data: {
            status: "succeeded",
            processor_response: data,
          },
        });

        // Create capture transaction
        await (prisma as any).transactionHistory.create({
          data: {
            order_id: order.id,
            type: "capture",
            amount: data.amount / 100, // Convert from kobo to NGN
            currency: data.currency || "NGN",
            payment_provider: "paystack",
            provider_reference: reference,
            status: "succeeded",
            processor_response: data,
          },
        });

        // Update order status
        await prisma.order.update({
          where: { id: order.id },
          data: {
            payment_status: "captured",
            status: "paid",
          },
        });

        return {
          success: true,
          message: "Payment verified successfully",
          transaction: data,
        };
      } else {
        // Payment failed
        await (prisma as any).transactionHistory.updateMany({
          where: {
            order_id: order.id,
            provider_reference: reference,
            type: "authorization",
          },
          data: {
            status: "failed",
            processor_response: data,
          },
        });

        return {
          success: false,
          message: "Payment verification failed",
          transaction: data,
        };
      }
    } catch (error: any) {
      console.error("Paystack verification error:", error);
      throw new Error(
        error.response?.data?.message || "Failed to verify payment"
      );
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

