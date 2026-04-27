import { handleGatewayWebhook } from "@/lib/payment-webhooks";
import {
  PAYMENT_GATEWAYS,
  PaymentGateway,
} from "@/lib/payment-config";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { gateway: string } }
) {
  const gateway = params.gateway as PaymentGateway;
  const validGateways = Object.values(PAYMENT_GATEWAYS);

  if (!validGateways.includes(gateway)) {
    return NextResponse.json({ message: "Unsupported payment gateway" }, { status: 404 });
  }

  return handleGatewayWebhook(gateway, request);
}
