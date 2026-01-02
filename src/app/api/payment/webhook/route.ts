import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

/**
 * Paystack Webhook Handler
 * Location: src/app/api/payment/webhook/route.ts
 * * Logic Flow:
 * 1. Verify Paystack signature.
 * 2. Handle 'charge.success':
 * - Prevent double-processing.
 * - Update initial authorization transaction to 'succeeded'.
 * - Create a new 'capture' transaction record.
 * - Update Order status to 'paid' and payment_status to 'captured'.
 * 3. Handle 'charge.failed':
 * - Update initial authorization transaction to 'failed'.
 * - Update Order payment_status to 'failed'.
 */

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const hash = req.headers.get("x-paystack-signature");

    // 1. Verify webhook signature
    const hashCheck = crypto
      .createHmac("sha512", PAYSTACK_SECRET_KEY)
      .update(body)
      .digest("hex");

    if (hash !== hashCheck) {
      return NextResponse.json(
        { message: "Invalid signature" },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);
    const data = event.data;
    const orderId = data.metadata?.order_id || data.reference;

    if (!orderId) {
      return NextResponse.json(
        { message: "Order ID not found in metadata or reference" },
        { status: 400 }
      );
    }

    // 2. Handle successful charge
    if (event.event === "charge.success") {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          line_items: {
            include: {
              book_variant: true,
            },
          },
        },
      });

      if (!order) {
        return NextResponse.json({ message: "Order not found" }, { status: 404 });
      }

      // Prevent double-processing
      if (order.payment_status === "captured") {
        return NextResponse.json({ message: "Payment already processed" });
      }

      // Atomic Update: Update transactions and order status
      await prisma.$transaction([
        // Update the initial authorization transaction
        (prisma as any).transactionHistory.updateMany({
          where: {
            order_id: order.id,
            provider_reference: data.reference,
            type: "authorization",
          },
          data: {
            status: "succeeded",
            processor_response: data,
          },
        }),
        // Create the capture transaction
        (prisma as any).transactionHistory.create({
          data: {
            order_id: order.id,
            type: "capture",
            amount: data.amount / 100, // Convert from kobo to NGN
            currency: data.currency || "NGN",
            payment_provider: "paystack",
            provider_reference: data.reference,
            status: "succeeded",
            processor_response: data,
          },
        }),
        // Update Order
        prisma.order.update({
          where: { id: order.id },
          data: {
            payment_status: "captured",
            status: "paid",
          },
        }),
      ]);

      console.log(`Webhook Success: Order ${order.id} fulfilled`);
      return NextResponse.json({ message: "Payment processed successfully" });
    }

    // 3. Handle failed charge
    if (event.event === "charge.failed") {
      await prisma.$transaction([
        // Update authorization transaction to failed
        (prisma as any).transactionHistory.updateMany({
          where: {
            order_id: orderId,
            provider_reference: data.reference,
            type: "authorization",
          },
          data: {
            status: "failed",
            processor_response: data,
          },
        }),
        // Update order status
        prisma.order.update({
          where: { id: orderId },
          data: {
            payment_status: "failed",
          },
        }),
      ]);
      
      console.log(`Webhook Log: Order ${orderId} marked as failed`);
    }

    return NextResponse.json({ message: "Webhook processed" });
  } catch (error: any) {
    console.error("Webhook Internal Error:", error);
    return NextResponse.json(
      { message: "Webhook processing failed", error: error.message },
      { status: 500 }
    );
  }
}