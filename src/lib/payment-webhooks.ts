import { NextResponse } from "next/server";
import {
  getPaymentGatewayAdapter,
  PaymentGateway,
} from "@/lib/payment-config";
import { finalizeCapturedPayment, finalizeFailedPayment } from "@/lib/payment-ops";

export async function handleGatewayWebhook(gateway: PaymentGateway, request: Request) {
  try {
    const adapter = getPaymentGatewayAdapter(gateway);
    const normalizedEvent = await adapter.normalizeWebhookEvent(request);

    if (!normalizedEvent.orderId || !normalizedEvent.reference) {
      return NextResponse.json(
        { message: "Order ID or reference not found in webhook payload" },
        { status: 400 }
      );
    }

    if (normalizedEvent.type === "charge.success") {
      await finalizeCapturedPayment({
        orderId: normalizedEvent.orderId,
        reference: normalizedEvent.reference,
        amount: normalizedEvent.amount,
        currency: normalizedEvent.currency,
        paymentProvider: gateway,
        processorResponse: normalizedEvent.processor_response,
      });

      return NextResponse.json({ message: "Payment processed successfully" });
    }

    if (normalizedEvent.type === "charge.failed") {
      await finalizeFailedPayment({
        orderId: normalizedEvent.orderId,
        reference: normalizedEvent.reference,
        processorResponse: normalizedEvent.processor_response,
      });

      return NextResponse.json({ message: "Failed payment recorded" });
    }

    return NextResponse.json({ message: "Webhook received" });
  } catch (error: any) {
    console.error(`[${gateway} webhook]`, error);
    return NextResponse.json(
      { message: "Webhook processing failed", error: error.message },
      { status: 500 }
    );
  }
}
