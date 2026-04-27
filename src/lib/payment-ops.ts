import prisma from "@/lib/prisma";
import { parseOrderNotes } from "@/lib/order-notes";
import { sendOrderConfirmationEmail } from "@/lib/email";

type FinalizeCapturedPaymentInput = {
  orderId: string;
  reference: string;
  amount: number;
  currency: string;
  paymentProvider: string;
  processorResponse: unknown;
};

type FinalizeFailedPaymentInput = {
  orderId: string;
  reference: string;
  processorResponse: unknown;
};

async function sendCapturedOrderEmail(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      line_items: {
        include: {
          book_variant: { include: { book: true } },
        },
      },
      customer: { include: { user: true } },
    },
  });

  if (!order?.customer?.user?.email) return;

  const parsedNotes = parseOrderNotes(order.notes);
  let deliveryState: string | undefined;
  let shippingZone: string | undefined;

  if (parsedNotes?.delivery_address?.state) {
    deliveryState = parsedNotes.delivery_address.state
      .split(" ")
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    shippingZone = parsedNotes.shipping_zone ?? parsedNotes.shipping_group ?? undefined;
  }

  const checkoutQuote = parsedNotes?.checkout_quote ?? null;

  const isDigitalOnly = order.line_items.every((item) => {
    const format = item.book_variant.format.toLowerCase();
    return format !== "paperback" && format !== "hardcover";
  });

  await sendOrderConfirmationEmail({
    to: order.customer.user.email,
    firstName: order.customer.user.first_name,
    orderNumber: order.order_number,
    orderDate: order.created_at,
    items: order.line_items.map((item) => ({
      title: item.book_variant.book?.title ?? "Book",
      type: item.book_variant.format,
      quantity: item.quantity,
      price: checkoutQuote?.fx_rate_to_base
        ? item.unit_price * checkoutQuote.fx_rate_to_base
        : item.unit_price,
    })),
    subtotal: checkoutQuote?.checkout_subtotal_amount ?? order.subtotal_amount,
    shippingCost: checkoutQuote?.checkout_shipping_amount ?? order.shipping_amount,
    total: checkoutQuote?.checkout_total_amount ?? order.total_amount,
    isDigitalOnly,
    deliveryState,
    shippingZone,
    currency: checkoutQuote?.checkout_currency ?? order.currency,
  });
}

export async function finalizeCapturedPayment(input: FinalizeCapturedPaymentInput) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      line_items: {
        include: {
          book_variant: { include: { book: true } },
        },
      },
      publisher: { include: { tenant: true } },
      customer: { include: { user: true } },
      transactions: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.payment_status === "captured") {
    return { success: true, orderId: order.id, customerId: order.customer_id };
  }

  const result = await prisma.$transaction(async (tx) => {
    const userId = order.customer?.user_id || (order as any).user_id;
    if (!userId) throw new Error("Could not resolve a User for this order.");

    const tenantSlug = order.publisher?.tenant?.slug;
    const publisherId = order.publisher_id;
    const primaryAuthorId = order.line_items[0]?.book_variant?.book?.author_id;

    let customer = await tx.customer.findFirst({
      where: { user_id: userId, publisher_id: publisherId },
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
        },
      });

      const customerRole = await tx.role.findUnique({ where: { name: "customer" } });
      if (customerRole && tenantSlug) {
        const existingClaim = await tx.claim.findFirst({
          where: { user_id: userId, role_name: "customer", tenant_slug: tenantSlug },
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
        data: { author_id: primaryAuthorId },
      });
    }

    await tx.transactionHistory.updateMany({
      where: {
        order_id: order.id,
        provider_reference: input.reference,
        type: "authorization",
      },
      data: {
        status: "succeeded",
        processor_response: input.processorResponse as any,
      },
    });

    const existingCapture = await tx.transactionHistory.findFirst({
      where: {
        order_id: order.id,
        provider_reference: input.reference,
        type: "capture",
      },
    });

    if (!existingCapture) {
      await tx.transactionHistory.create({
        data: {
          order_id: order.id,
          type: "capture",
          amount: input.amount,
          currency: input.currency,
          payment_provider: input.paymentProvider,
          provider_reference: input.reference,
          status: "succeeded",
          processor_response: input.processorResponse as any,
        },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        payment_status: "captured",
        status: "paid",
        customer_id: customer.id,
      },
    });

    return { success: true, orderId: order.id, customerId: customer.id };
  });

  void sendCapturedOrderEmail(order.id).catch((mailErr) => {
    console.error("[finalizeCapturedPayment] Order confirmation email failed:", mailErr);
  });

  return result;
}

export async function finalizeFailedPayment(input: FinalizeFailedPaymentInput) {
  await prisma.$transaction([
    prisma.transactionHistory.updateMany({
      where: {
        order_id: input.orderId,
        provider_reference: input.reference,
        type: "authorization",
      },
      data: {
        status: "failed",
        processor_response: input.processorResponse as any,
      },
    }),
    prisma.order.update({
      where: { id: input.orderId },
      data: {
        payment_status: "failed",
      },
    }),
  ]);
}
