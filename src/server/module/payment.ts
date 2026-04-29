import prisma from "@/lib/prisma";
import { z } from "zod";
import axios from "axios";
import { TRPCError } from "@trpc/server";
import { publicProcedure } from "@/server/trpc";
import {
  initializePaymentSchema,
  verifyPaymentSchema,
  createTransactionSchema,
} from "../dtos";
import {
  DEFAULT_CURRENCY_SETTINGS,
  DEFAULT_PAYMENT_GATEWAY_SETTINGS,
  getPaymentGatewayAdapter,
  getCurrencyRate,
  getPaymentGatewayHealthMap,
  hasValidCheckoutCurrencyRate,
  PAYMENT_GATEWAYS,
  PaymentGateway,
  normalizeCurrencySettings,
  normalizePaymentGatewaySettings,
} from "@/lib/payment-config";
import { mergeOrderNotes, parseOrderNotes } from "@/lib/order-notes";
import { finalizeCapturedPayment, finalizeFailedPayment } from "@/lib/payment-ops";
import {
  buildPaystackSettlementPlan,
  resolveOrderPayoutRoutingSnapshot,
} from "@/lib/payout-routing";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function getSavedCheckoutQuote(notes: string | null | undefined) {
  return parseOrderNotes(notes)?.checkout_quote ?? null;
}

function getSavedPayoutRouting(notes: string | null | undefined) {
  return parseOrderNotes(notes)?.payout_routing ?? null;
}

async function getPaymentSettings() {
  const settingsRaw = await prisma.systemSettings.findMany();
  const settings: Record<string, any> = {};
  for (const setting of settingsRaw) settings[setting.key] = setting.value;

  const currencySettings = normalizeCurrencySettings(
    settings.currency_settings ?? DEFAULT_CURRENCY_SETTINGS
  );
  const paymentGatewaySettings = normalizePaymentGatewaySettings(
    settings.payment_gateway_settings ?? DEFAULT_PAYMENT_GATEWAY_SETTINGS
  );
  const paymentGatewayHealth = getPaymentGatewayHealthMap(paymentGatewaySettings);

  return {
    currencySettings,
    paymentGatewaySettings,
    paymentGatewayHealth,
  };
}

// ---------------------------------------------------------------------------
// initializePayment
// ---------------------------------------------------------------------------

export const initializePayment = publicProcedure
  .input(initializePaymentSchema)
  .mutation(async (opts) => {
    const {
      order_id,
      email,
      amount,
      currency,
      callback_url,
      payment_gateway,
    } = opts.input;

    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: {
        customer: { include: { user: true } },
        publisher: {
          include: {
            tenant: true,
            user: {
              include: {
                payment_account: true,
              },
            },
          },
        },
        line_items: {
          include: {
            book_variant: {
              include: {
                book: {
                  include: {
                    author: {
                      include: {
                        user: {
                          include: {
                            payment_account: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) throw new Error("Order not found");
    if (order.payment_status !== "pending") {
      throw new Error(`Order payment status is ${order.payment_status}, cannot initialize payment`);
    }

    const { currencySettings, paymentGatewaySettings, paymentGatewayHealth } = await getPaymentSettings();
    const savedQuote = getSavedCheckoutQuote(order.notes);

    const resolvedGateway = (payment_gateway
      ?? savedQuote?.payment_gateway
      ?? PAYMENT_GATEWAYS.PAYSTACK) as PaymentGateway;
    const resolvedCurrency = savedQuote?.checkout_currency
      ?? currency
      ?? order.currency
      ?? currencySettings.base_currency;
    const resolvedAmount = savedQuote?.checkout_total_amount
      ?? amount
      ?? order.total_amount;

    if (resolvedAmount <= 0) {
      const result = await finalizeCapturedPayment({
        orderId: order.id,
        reference: `free_${order.order_number}`,
        amount: 0,
        currency: resolvedCurrency,
        paymentProvider: "free",
        processorResponse: {
          mode: "free_claim",
          order_number: order.order_number,
        },
      });

      return {
        authorization_url: `${APP_URL}/orders/${order.id}`,
        access_code: null,
        reference: `free_${order.order_number}`,
        provider: "free",
        success: result.success,
      };
    }

    const gatewayHealth = paymentGatewayHealth[resolvedGateway];
    const adapter = getPaymentGatewayAdapter(resolvedGateway);
    const gatewaySettings = paymentGatewaySettings[resolvedGateway];

    if (!gatewayHealth?.checkout_ready) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${gatewaySettings.display_name || resolvedGateway} is not currently available.`,
      });
    }

    if (!adapter.supportsCurrency(resolvedCurrency, gatewaySettings)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${gatewaySettings.display_name || resolvedGateway} does not support ${resolvedCurrency}.`,
      });
    }

    if (!hasValidCheckoutCurrencyRate(resolvedCurrency, currencySettings)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Please configure a valid NGN conversion rate for ${resolvedCurrency} before using it at checkout.`,
      });
    }

    const resolvedPayoutRouting = resolveOrderPayoutRoutingSnapshot(
      getSavedPayoutRouting(order.notes),
      !!order.publisher?.white_label,
    );

    let paystackSettlementPlan = null;
    if (resolvedGateway === PAYMENT_GATEWAYS.PAYSTACK) {
      if ((order.currency || "").toUpperCase() !== "NGN") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Paystack direct settlement splitting is currently available only when the order base currency is NGN.",
        });
      }

      try {
        paystackSettlementPlan = buildPaystackSettlementPlan({
          orderNumber: order.order_number,
          currency: resolvedCurrency,
          subtotalAmount: order.subtotal_amount,
          totalAmount: order.total_amount,
          publisher: order.publisher
            ? {
                id: order.publisher.id,
                display_name: order.publisher.tenant?.name
                  || `${order.publisher.user?.first_name ?? ""} ${order.publisher.user?.last_name ?? ""}`.trim()
                  || "Publisher",
                subaccount_code: order.publisher.user?.payment_account?.paystack_subaccount_code ?? null,
              }
            : null,
          payoutRouting: resolvedPayoutRouting,
          lineItems: order.line_items,
        });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error
            ? error.message
            : "The payout settlement split for this order could not be prepared.",
        });
      }
    }

    let session;
    try {
      session = await adapter.createPaymentSession({
        orderId: order.id,
        orderNumber: order.order_number,
        email,
        amount: resolvedAmount,
        currency: resolvedCurrency,
        callbackUrl: callback_url || `${APP_URL}/payment/verify?order_id=${order_id}&gateway=${resolvedGateway}`,
        metadata: {
          customer_id: order.customer_id,
        },
        settlement: paystackSettlementPlan
          ? {
              paystack: {
                subaccount: paystackSettlementPlan.subaccount,
                transaction_charge: paystackSettlementPlan.transaction_charge,
                bearer: paystackSettlementPlan.bearer,
                split: paystackSettlementPlan.split,
              },
            }
          : undefined,
      });
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `${gatewaySettings.display_name || resolvedGateway} could not initialize ${resolvedCurrency}. Confirm that this gateway account supports that currency in the current environment.`,
          });
        }

        const gatewayMessage = error.response?.data?.message
          || error.response?.data?.error
          || error.message;

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${gatewaySettings.display_name || resolvedGateway} could not initialize payment: ${gatewayMessage}`,
        });
      }

      throw error;
    }

    await prisma.transactionHistory.create({
      data: {
        order_id: order.id,
        type: "authorization",
        amount: resolvedAmount,
        currency: resolvedCurrency,
        payment_provider: resolvedGateway,
        provider_reference: session.reference,
        status: "pending",
        processor_response: {
          checkout_quote: savedQuote,
          settlement: paystackSettlementPlan,
          session: session.processor_response,
        } as any,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        notes: mergeOrderNotes(order.notes, {
          checkout_quote: savedQuote ?? {
            base_currency: order.currency,
            checkout_currency: resolvedCurrency,
            fx_rate_to_base: getCurrencyRate(resolvedCurrency, currencySettings),
            base_subtotal_amount: order.subtotal_amount,
            base_shipping_amount: order.shipping_amount,
            base_total_amount: order.total_amount,
            checkout_subtotal_amount: order.subtotal_amount,
            checkout_shipping_amount: order.shipping_amount,
            checkout_total_amount: resolvedAmount,
            payment_gateway: resolvedGateway,
            payment_method: null,
          },
          payment_settlement: paystackSettlementPlan,
        }),
      },
    });

    return {
      authorization_url: session.authorization_url,
      access_code: session.access_code,
      reference: session.reference,
      provider: resolvedGateway,
    };
  });

// ---------------------------------------------------------------------------
// verifyPayment
// ---------------------------------------------------------------------------

export const verifyPayment = publicProcedure
  .input(verifyPaymentSchema)
  .mutation(async (opts) => {
    const { reference, order_id } = opts.input;

    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: {
        transactions: { orderBy: { created_at: "desc" } },
      },
    });

    if (!order) throw new Error("Order not found");

    const savedQuote = getSavedCheckoutQuote(order.notes);
    const latestGateway = order.transactions.find((tx) => tx.payment_provider)?.payment_provider;
    const resolvedGateway = (savedQuote?.payment_gateway
      ?? latestGateway
      ?? PAYMENT_GATEWAYS.PAYSTACK) as PaymentGateway;

    const adapter = getPaymentGatewayAdapter(resolvedGateway);
    const verification = await adapter.verifyPayment(reference);

    if (verification.success) {
      return await finalizeCapturedPayment({
        orderId: order.id,
        reference,
        amount: verification.amount,
        currency: verification.currency,
        paymentProvider: resolvedGateway,
        processorResponse: verification.processor_response,
      });
    }

    await finalizeFailedPayment({
      orderId: order.id,
      reference,
      processorResponse: verification.processor_response,
    });

    return { success: false, message: "Payment verification failed at gateway" };
  });

// ---------------------------------------------------------------------------
// createTransaction
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// getTransactionsByOrder
// ---------------------------------------------------------------------------

export const getTransactionsByOrder = publicProcedure
  .input(z.object({ order_id: z.string() }))
  .query(async (opts) => {
    return await prisma.transactionHistory.findMany({
      where: { order_id: opts.input.order_id },
      orderBy: { created_at: "desc" },
    });
  });
