import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const hash = request.headers.get("x-paystack-signature");

    // Verify webhook signature
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

    // Handle different Paystack events
    if (event.event === "charge.success") {
      const { reference, amount, customer, metadata } = event.data;

      const orderId = metadata?.order_id;
      if (!orderId) {
        return NextResponse.json(
          { message: "Order ID not found in metadata" },
          { status: 400 }
        );
      }

      // Get order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return NextResponse.json(
          { message: "Order not found" },
          { status: 404 }
        );
      }

      // Check if already processed
      if (order.payment_status === "captured") {
        return NextResponse.json({ message: "Payment already processed" });
      }

      // Update authorization transaction
      await (prisma as any).transactionHistory.updateMany({
        where: {
          order_id: orderId,
          provider_reference: reference,
          type: "authorization",
        },
        data: {
          status: "succeeded",
          processor_response: event.data,
        },
      });

      // Create capture transaction
      await (prisma as any).transactionHistory.create({
        data: {
          order_id: orderId,
          type: "capture",
          amount: amount / 100, // Convert from kobo to NGN
          currency: "NGN",
          payment_provider: "paystack",
          provider_reference: reference,
          status: "succeeded",
          processor_response: event.data,
        },
      });

      // Update order status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          payment_status: "captured",
          status: "paid",
        },
      });

      return NextResponse.json({ message: "Payment processed successfully" });
    }

    // Handle other events (charge.failed, etc.)
    if (event.event === "charge.failed") {
      const { reference, metadata } = event.data;
      const orderId = metadata?.order_id;

      if (orderId) {
        // Update transaction status to failed
        await (prisma as any).transactionHistory.updateMany({
          where: {
            order_id: orderId,
            provider_reference: reference,
            type: "authorization",
          },
          data: {
            status: "failed",
            processor_response: event.data,
          },
        });

        // Update order payment status
        await prisma.order.update({
          where: { id: orderId },
          data: {
            payment_status: "failed",
          },
        });
      }
    }

    return NextResponse.json({ message: "Webhook processed" });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { message: "Webhook processing failed", error: error.message },
      { status: 500 }
    );
  }
}

