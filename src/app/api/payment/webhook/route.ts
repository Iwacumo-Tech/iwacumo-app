import { handleGatewayWebhook } from "@/lib/payment-webhooks";
import { PAYMENT_GATEWAYS } from "@/lib/payment-config";

export async function POST(request: Request) {
  return handleGatewayWebhook(PAYMENT_GATEWAYS.PAYSTACK, request);
}
