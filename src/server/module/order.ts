
import prisma from "@/lib/prisma";
import { z } from "zod";
import { publicProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import {
  createOrderFromCartSchema,
  getOrderByIdSchema,
  getOrdersByCustomerSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  createDeliveryTrackingSchema,
  updateDeliveryTrackingSchema,
  getDeliveriesByOrderSchema,
  getOrdersNeedingShippingSchema,
} from "../dtos";
import {
  calcShippingCostForProvider,
  DEFAULT_FEZ_SHIPPING_RATES,
  DEFAULT_SHIPPING_PROVIDER_OPTIONS,
  DEFAULT_SPEEDAF_SHIPPING_RATES,
  FezShippingRates,
  ShippingProvider,
  ShippingProviderOptions,
  SHIPPING_PROVIDERS,
  SpeedafShippingRates,
} from "@/lib/constants";
import {
  convertBaseAmount,
  DEFAULT_CURRENCY_SETTINGS,
  DEFAULT_PAYMENT_GATEWAY_SETTINGS,
  getAvailablePaymentGateways,
  getCurrencyRate,
  hasValidCheckoutCurrencyRate,
  getPaymentGatewayHealthMap,
  normalizeCurrencySettings,
  normalizePaymentGatewaySettings,
} from "@/lib/payment-config";
import {
  appendCancellationReason,
  mergeOrderNotes,
  parseOrderNotes,
} from "@/lib/order-notes";
import { buildOrderPayoutRoutingSnapshot } from "@/lib/payout-routing";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { resolveUserContext } from "@/lib/is-super-admin";

const PUBLISHER_SPLIT_FALLBACK = 30;

const generateOrderNumber = (): string => {
  const timestamp = Date.now();
  const random    = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `ORD-${timestamp}-${random}`;
};

const mapBookTypeToFormat = (bookType: string): string => {
  const typeMap: Record<string, string> = {
    "Paper-back": "paperback", paperback: "paperback",
    "E-copy": "ebook", ebook: "ebook", "e-copy": "ebook",
    "Hard-cover": "hardcover", hardcover: "hardcover",
    "Hard Cover": "hardcover", Hardcover: "hardcover",
    Audiobook: "audiobook", audiobook: "audiobook",
  };
  if (typeMap[bookType]) return typeMap[bookType];
  const lower = bookType.toLowerCase().trim();
  for (const [key, value] of Object.entries(typeMap)) {
    if (key.toLowerCase() === lower) return value;
  }
  return lower.replace(/\s+/g, "").replace(/-/g, "");
};

const isPhysicalFormat = (format: string) =>
  format === "paperback" || format === "hardcover";

// ─── createOrderFromCart ──────────────────────────────────────────────────────

export const createOrderFromCart = publicProcedure
  .input(createOrderFromCartSchema)
  .mutation(async (opts) => {
    const {
      user_id, shipping_address_id, billing_address_id,
      tax_amount = 0, shipping_amount = 0, discount_amount = 0,
      currency, checkout_currency, payment_gateway,
      channel, notes, delivery_address, requires_delivery, shipping_provider,
    } = opts.input;

    const user = await prisma.user.findUnique({
      where: { id: user_id }, include: { customers: true },
    });
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

    const cartItems = await prisma.cart.findMany({
      where: { userId: user_id, deleted_at: null },
    });
    if (cartItems.length === 0)
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cart is empty" });

    const firstBook = await prisma.book.findFirst({
      where: { title: cartItems[0]?.book_title, deleted_at: null },
    });
    const targetPublisherId = firstBook?.publisher_id ?? null;

    let customer = user.customers.find(c => c.publisher_id === targetPublisherId);
    if (!customer && targetPublisherId) {
      customer = await prisma.customer.create({
        data: {
          user_id: user.id, publisher_id: targetPublisherId,
          name: `${user.first_name} ${user.last_name || ""}`.trim() || user.email,
        },
      });
    }

    const settingsRaw = await prisma.systemSettings.findMany();
    const settings: Record<string, any> = {};
    for (const s of settingsRaw) settings[s.key] = s.value;

    const platformFeeSetting = settings["platform_fee"] as
      | { type: "percentage" | "flat"; value: number } | undefined;
    const shippingRates = (settings["shipping_rates"] as
      | SpeedafShippingRates | undefined) ?? DEFAULT_SPEEDAF_SHIPPING_RATES;
    const shippingProviderOptions = (settings["shipping_provider_options"] as
      | ShippingProviderOptions | undefined) ?? DEFAULT_SHIPPING_PROVIDER_OPTIONS;
    const fezShippingRates = (settings["fez_shipping_rates"] as
      | FezShippingRates | undefined) ?? DEFAULT_FEZ_SHIPPING_RATES;
    const currencySettings = normalizeCurrencySettings(
      settings["currency_settings"] ?? DEFAULT_CURRENCY_SETTINGS
    );
    const paymentGatewaySettings = normalizePaymentGatewaySettings(
      settings["payment_gateway_settings"] ?? DEFAULT_PAYMENT_GATEWAY_SETTINGS
    );
    const paymentGatewayHealth = getPaymentGatewayHealthMap(paymentGatewaySettings);
    const baseCurrency = currencySettings.base_currency;

    type LineItemData = {
      book_variant_id: string; quantity: number;
      unit_price: number; total_price: number;
      platform_fee: number; publisher_earnings: number;
      author_earnings: number; weight_grams: number;
    };

    const orderLineItemsData: LineItemData[] = [];
    let subtotal = 0, totalWeightGrams = 0;
    const errors: string[] = [];

    for (const cartItem of cartItems) {
      // Fetch book with split data in one query.
      // split_override: defined on Book model (line 264 of schema).
      // author.publisher_splits: Author has publisher_splits relation (schema line 185).
      const book = await prisma.book.findFirst({
        where:   { title: cartItem.book_title, deleted_at: null },
        include: {
          variants:       true,
          split_override: true,
          author: {
            include: {
              publisher_splits: {
                where: { publisher_id: targetPublisherId ?? "" },
                take:  1,
              },
            },
          },
        },
      });

      if (!book) { errors.push(`Book "${cartItem.book_title}" not found`); continue; }

      // Resolve variant
      const variantFormat = mapBookTypeToFormat(cartItem.book_type);
      let variant = book.variants.find(v => v.format.toLowerCase() === variantFormat.toLowerCase());
      if (!variant) {
        const norm = variantFormat.replace(/[\s-]/g, "").toLowerCase();
        variant = book.variants.find(v => v.format.replace(/[\s-]/g, "").toLowerCase() === norm);
      }
      if (!variant) {
        variant = await prisma.bookVariant.create({
          data: { book_id: book.id, format: variantFormat, list_price: cartItem.price, currency: baseCurrency || "NGN", stock_quantity: 0, status: "active" },
        });
      }

      const unitPrice  = variant.discount_price ?? variant.list_price;
      const quantity   = cartItem.quantity || 1;
      const totalPrice = unitPrice * quantity;

      // Platform fee
      let platformFee: number;
      if (platformFeeSetting?.type === "flat") {
        platformFee = platformFeeSetting.value;
      } else {
        platformFee = (totalPrice * (platformFeeSetting?.value ?? 10)) / 100;
      }
      const remainder = totalPrice - platformFee;

      // ── Split resolution chain ────────────────────────────────────────
      let publisherSplitPercent: number;
      let splitSource: string;

      if (book.split_override) {
        publisherSplitPercent = book.split_override.publisher_split_percent;
        splitSource           = "book_override";
      } else if (book.author?.publisher_splits?.[0]) {
        publisherSplitPercent = book.author.publisher_splits[0].publisher_split_percent;
        splitSource           = "author_default";
      } else {
        publisherSplitPercent = PUBLISHER_SPLIT_FALLBACK;
        splitSource           = "platform_fallback";
      }

      const publisherEarnings = (remainder * publisherSplitPercent) / 100;
      const authorEarnings    = remainder - publisherEarnings;

      if (process.env.NODE_ENV !== "production") {
        console.log(`[Split] "${book.title}" | ${splitSource} | pub=${publisherSplitPercent}%(₦${publisherEarnings.toFixed(0)}) author=${100 - publisherSplitPercent}%(₦${authorEarnings.toFixed(0)})`);
      }

      const itemWeightGrams = isPhysicalFormat(variantFormat)
        ? (variant.weight_grams ?? 400) * quantity : 0;
      totalWeightGrams += itemWeightGrams;

      orderLineItemsData.push({
        book_variant_id: variant.id, quantity,
        unit_price: unitPrice, total_price: totalPrice,
        platform_fee: platformFee, publisher_earnings: publisherEarnings,
        author_earnings: authorEarnings, weight_grams: itemWeightGrams,
      });
      subtotal += totalPrice;
    }

    if (errors.length > 0)
      throw new TRPCError({ code: "BAD_REQUEST", message: errors.join(", ") });

      const enabledProviders = (Object.entries(shippingProviderOptions) as Array<[ShippingProvider, { enabled: boolean }]>) 
        .filter(([, config]) => config?.enabled)
        .map(([provider]) => provider);

      const targetPublisher = targetPublisherId
        ? await prisma.publisher.findUnique({
            where: { id: targetPublisherId },
            select: { white_label: true },
          })
        : null;
      const payoutRouting = buildOrderPayoutRoutingSnapshot(!!targetPublisher?.white_label);

    const resolvedShippingProvider: ShippingProvider | undefined =
      shipping_provider
      ?? (enabledProviders.length === 1 ? enabledProviders[0] : undefined);

    if (requires_delivery) {
      if (!enabledProviders.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No shipping provider is currently enabled. Please contact support.",
        });
      }

      if (!resolvedShippingProvider) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please select a shipping provider before continuing.",
        });
      }

      if (!enabledProviders.includes(resolvedShippingProvider)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The selected shipping provider is not currently available.",
        });
      }
    }

    const supportedCheckoutCurrencies = currencySettings.supported_checkout_currencies;
    const resolvedCheckoutCurrency = supportedCheckoutCurrencies.includes(checkout_currency)
      ? checkout_currency
      : currencySettings.default_checkout_currency;

    // Server-side shipping validation
    let verifiedShippingAmount = shipping_amount;
    let shippingLabel: string | null = null;
    if (requires_delivery && delivery_address?.state && totalWeightGrams > 0) {
      const shippingQuote = calcShippingCostForProvider({
        provider: resolvedShippingProvider ?? SHIPPING_PROVIDERS.SPEEDAF,
        state: delivery_address.state,
        weightGrams: totalWeightGrams,
        speedafRates: shippingRates,
        fezRates: fezShippingRates,
      });
      const serverComputed = shippingQuote.amount;
      shippingLabel = shippingQuote.label;
      if (shipping_amount === 0) {
        verifiedShippingAmount = serverComputed;
      } else if (Math.abs(shipping_amount - serverComputed) > 200) {
        console.warn(`[Order] Shipping mismatch: client=₦${shipping_amount} server=₦${serverComputed}. Using server.`);
        verifiedShippingAmount = serverComputed;
      }
    }

    const totalAmount = subtotal + tax_amount + verifiedShippingAmount - discount_amount;
    const fxRateToBase = getCurrencyRate(resolvedCheckoutCurrency, currencySettings);
    const checkoutSubtotalAmount = convertBaseAmount(subtotal, resolvedCheckoutCurrency, currencySettings);
    const checkoutShippingAmount = convertBaseAmount(verifiedShippingAmount, resolvedCheckoutCurrency, currencySettings);
    const checkoutTotalAmount = convertBaseAmount(totalAmount, resolvedCheckoutCurrency, currencySettings);
    const orderNumber = generateOrderNumber();
    const isFreeOrder = totalAmount <= 0;

    if (!isFreeOrder && !hasValidCheckoutCurrencyRate(resolvedCheckoutCurrency, currencySettings)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Please configure a valid NGN conversion rate for ${resolvedCheckoutCurrency} before using it at checkout.`,
      });
    }

    const availablePaymentGateways = isFreeOrder
      ? []
      : getAvailablePaymentGateways({
          currency: resolvedCheckoutCurrency,
          settings: paymentGatewaySettings,
          health: paymentGatewayHealth,
        });

    if (!isFreeOrder && !availablePaymentGateways.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `No payment gateway is currently available for ${resolvedCheckoutCurrency}.`,
      });
    }

    const autoGateway = availablePaymentGateways.length === 1 ? availablePaymentGateways[0].gateway : null;
    const resolvedPaymentGateway = isFreeOrder
      ? null
      : (payment_gateway && availablePaymentGateways.some((gateway) => gateway.gateway === payment_gateway)
          ? payment_gateway
          : autoGateway);

    if (!isFreeOrder && !resolvedPaymentGateway) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Please select a valid payment gateway before continuing.",
      });
    }

      const orderNotes = mergeOrderNotes(notes || null, {
        notes_text: notes || null,
        delivery_address: requires_delivery ? (delivery_address ?? null) : null,
        delivery_required: requires_delivery,
        requires_physical_delivery: requires_delivery,
      shipping_provider: requires_delivery ? (resolvedShippingProvider ?? null) : null,
        shipping_zone: requires_delivery && resolvedShippingProvider === SHIPPING_PROVIDERS.SPEEDAF ? shippingLabel : null,
        shipping_group: requires_delivery && resolvedShippingProvider === SHIPPING_PROVIDERS.FEZ ? shippingLabel : null,
        total_weight_grams: requires_delivery ? totalWeightGrams : 0,
        payout_routing: payoutRouting,
        checkout_quote: {
        base_currency: baseCurrency,
        checkout_currency: resolvedCheckoutCurrency,
        fx_rate_to_base: resolvedCheckoutCurrency === baseCurrency ? 1 : fxRateToBase,
        base_subtotal_amount: subtotal,
        base_shipping_amount: verifiedShippingAmount,
        base_total_amount: totalAmount,
        checkout_subtotal_amount: checkoutSubtotalAmount,
        checkout_shipping_amount: checkoutShippingAmount,
        checkout_total_amount: checkoutTotalAmount,
        payment_gateway: resolvedPaymentGateway,
        payment_method: null,
      },
    });

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          order_number: orderNumber, customer_id: customer!.id,
          publisher_id: targetPublisherId, total_amount: totalAmount,
          currency: baseCurrency || currency || "NGN", subtotal_amount: subtotal,
          tax_amount, shipping_amount: verifiedShippingAmount, discount_amount,
          status: isFreeOrder ? "paid" : "draft",
          payment_status: isFreeOrder ? "captured" : "pending",
          channel: channel || "web",
          notes: orderNotes, shipping_address_id: shipping_address_id || null,
          billing_address_id: billing_address_id || null,
        },
      });

      if (isFreeOrder) {
        await tx.transactionHistory.create({
          data: {
            order_id: newOrder.id,
            type: "capture",
            amount: 0,
            currency: resolvedCheckoutCurrency || baseCurrency || currency || "NGN",
            payment_provider: "free",
            provider_reference: `free_${newOrder.order_number}`,
            status: "succeeded",
            processor_response: {
              mode: "free_claim",
              order_number: newOrder.order_number,
              checkout_currency: resolvedCheckoutCurrency,
            },
          },
        });
      }

      for (const itemData of orderLineItemsData) {
        await tx.orderLineItem.create({
          data: {
            order_id: newOrder.id, book_variant_id: itemData.book_variant_id,
            quantity: itemData.quantity, unit_price: itemData.unit_price,
            currency: baseCurrency || currency || "NGN", total_price: itemData.total_price,
            platform_fee: itemData.platform_fee,
            publisher_earnings: itemData.publisher_earnings,
            author_earnings: itemData.author_earnings,
            fulfillment_status: "unfulfilled",
          },
        });
      }
      await tx.cart.updateMany({
        where: { userId: user_id, deleted_at: null },
        data:  { deleted_at: new Date() },
      });
      return newOrder;
    });

    const createdOrder = await prisma.order.findUnique({
      where:   { id: order.id },
      include: {
        line_items: { include: { book_variant: { include: { book: true } } } },
        customer:   { include: { user: true } },
        publisher:  true,
      },
    });

    if (isFreeOrder && createdOrder?.customer?.user?.email) {
      void (async () => {
        try {
          let deliveryState: string | undefined;
          let shippingZone: string | undefined;
          let shippingGroup: string | undefined;
          let chargedCurrency: string | undefined;
          let chargedSubtotal: number | undefined;
          let chargedShipping: number | undefined;
          let chargedTotal: number | undefined;

          const parsed = parseOrderNotes(createdOrder.notes);
          if (parsed?.delivery_address?.state) {
            deliveryState = parsed.delivery_address.state
              .split(" ")
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
            shippingZone = parsed.shipping_zone ?? undefined;
            shippingGroup = parsed.shipping_group ?? undefined;
          }
          if (parsed?.checkout_quote) {
            chargedCurrency = parsed.checkout_quote.checkout_currency;
            chargedSubtotal = parsed.checkout_quote.checkout_subtotal_amount;
            chargedShipping = parsed.checkout_quote.checkout_shipping_amount;
            chargedTotal = parsed.checkout_quote.checkout_total_amount;
          }

          const isDigitalOnly = createdOrder.line_items.every((item) => {
            const format = item.book_variant.format.toLowerCase();
            return format !== "paperback" && format !== "hardcover";
          });

          await sendOrderConfirmationEmail({
            to: createdOrder.customer.user.email,
            firstName: createdOrder.customer.user.first_name,
            orderNumber: createdOrder.order_number,
            orderDate: createdOrder.created_at,
            items: createdOrder.line_items.map((item) => ({
              title: item.book_variant.book?.title ?? "Book",
              type: item.book_variant.format,
              quantity: item.quantity,
              price: item.unit_price,
            })),
            subtotal: chargedSubtotal ?? createdOrder.subtotal_amount,
            shippingCost: chargedShipping ?? createdOrder.shipping_amount,
            total: chargedTotal ?? createdOrder.total_amount,
            isDigitalOnly,
            deliveryState,
            shippingZone: shippingZone ?? shippingGroup,
            currency: chargedCurrency ?? createdOrder.currency,
          });
        } catch (mailErr) {
          console.error("[createOrderFromCart] Free order confirmation email failed:", mailErr);
        }
      })();
    }

    if (!createdOrder) {
      return createdOrder;
    }

    const parsedCreatedOrderNotes = parseOrderNotes(createdOrder?.notes);

      return {
        ...createdOrder,
        delivery_address: parsedCreatedOrderNotes?.delivery_address ?? null,
        shipping_provider: parsedCreatedOrderNotes?.shipping_provider ?? null,
        shipping_zone: parsedCreatedOrderNotes?.shipping_zone ?? null,
        shipping_group: parsedCreatedOrderNotes?.shipping_group ?? null,
        payout_routing: parsedCreatedOrderNotes?.payout_routing ?? null,
        checkout_currency: parsedCreatedOrderNotes?.checkout_quote?.checkout_currency ?? null,
      fx_rate_to_base: parsedCreatedOrderNotes?.checkout_quote?.fx_rate_to_base ?? null,
      checkout_subtotal_amount: parsedCreatedOrderNotes?.checkout_quote?.checkout_subtotal_amount ?? null,
      checkout_shipping_amount: parsedCreatedOrderNotes?.checkout_quote?.checkout_shipping_amount ?? null,
      checkout_total_amount: parsedCreatedOrderNotes?.checkout_quote?.checkout_total_amount ?? null,
      payment_gateway: parsedCreatedOrderNotes?.checkout_quote?.payment_gateway ?? null,
      payment_method: parsedCreatedOrderNotes?.checkout_quote?.payment_method ?? null,
    };
  });

// ─── getOrderById ─────────────────────────────────────────────────────────────

export const getOrderById = publicProcedure.input(getOrderByIdSchema).query(async (opts) => {
  const order = await prisma.order.findUnique({
    where: { id: opts.input.id },
    include: {
      line_items: { include: { book_variant: { include: { book: { include: { publisher: true, primary_author: true } } } } } },
      customer: { include: { user: true } }, publisher: true,
      transactions: { orderBy: { created_at: "desc" } },
      deliveries:   { orderBy: { created_at: "desc" } },
    },
  });

  if (!order) return order;

  const parsedNotes = parseOrderNotes(order.notes);
    return {
      ...order,
      delivery_address: parsedNotes?.delivery_address ?? null,
      shipping_provider: parsedNotes?.shipping_provider ?? null,
      shipping_zone: parsedNotes?.shipping_zone ?? null,
      shipping_group: parsedNotes?.shipping_group ?? null,
      payout_routing: parsedNotes?.payout_routing ?? null,
      checkout_currency: parsedNotes?.checkout_quote?.checkout_currency ?? null,
    fx_rate_to_base: parsedNotes?.checkout_quote?.fx_rate_to_base ?? null,
    checkout_subtotal_amount: parsedNotes?.checkout_quote?.checkout_subtotal_amount ?? null,
    checkout_shipping_amount: parsedNotes?.checkout_quote?.checkout_shipping_amount ?? null,
    checkout_total_amount: parsedNotes?.checkout_quote?.checkout_total_amount ?? null,
    payment_gateway: parsedNotes?.checkout_quote?.payment_gateway ?? null,
    payment_method: parsedNotes?.checkout_quote?.payment_method ?? null,
  };
});

// ─── getOrdersByCustomer ──────────────────────────────────────────────────────

export const getOrdersByCustomer = publicProcedure.input(getOrdersByCustomerSchema).query(async (opts) => {
  return await prisma.order.findMany({
    where: { customer_id: opts.input.customer_id },
    include: {
      line_items: { include: { book_variant: { include: { book: true } } } },
      publisher: true,
      transactions: { orderBy: { created_at: "desc" }, take: 1 },
      deliveries:   { orderBy: { created_at: "desc" }, take: 1 },
    },
    orderBy: { created_at: "desc" },
  });
});

// ─── getOrdersByUser ──────────────────────────────────────────────────────────

export const getOrdersByUser = publicProcedure.input(z.object({ user_id: z.string() })).query(async (opts) => {
  const customer = await prisma.customer.findFirst({ where: { user_id: opts.input.user_id } });
  if (!customer) return [];
  return await prisma.order.findMany({
    where: { customer_id: customer.id },
    include: {
      line_items: { include: { book_variant: { include: { book: true } } } },
      publisher: true,
      transactions: { orderBy: { created_at: "desc" }, take: 1 },
      deliveries:   { orderBy: { created_at: "desc" }, take: 1 },
    },
    orderBy: { created_at: "desc" },
  });
});

// ─── getDeliveriesByCustomer ──────────────────────────────────────────────────

export const getDeliveriesByCustomer = publicProcedure.input(z.object({ user_id: z.string() })).query(async (opts) => {
  const customer = await prisma.customer.findFirst({ where: { user_id: opts.input.user_id } });
  if (!customer) return [];
  const orders = await prisma.order.findMany({ where: { customer_id: customer.id }, select: { id: true } });
  return await prisma.deliveryTracking.findMany({
    where: { order_id: { in: orders.map(o => o.id) } },
    include: {
      order: { include: { line_items: { include: { book_variant: { include: { book: true } } } } } },
      order_lineitem: { include: { book_variant: { include: { book: true } } } },
    },
    orderBy: { created_at: "desc" },
  });
});

// ─── updateOrderStatus ────────────────────────────────────────────────────────

export const updateOrderStatus = publicProcedure.input(updateOrderStatusSchema).mutation(async (opts) => {
  const { id, status, payment_status } = opts.input;
  const updateData: any = {};
  if (status) updateData.status = status;
  if (payment_status) updateData.payment_status = payment_status;
  return await prisma.order.update({
    where: { id }, data: updateData,
    include: { line_items: { include: { book_variant: { include: { book: true } } } }, customer: { include: { user: true } }, publisher: true },
  });
});

// ─── cancelOrder ─────────────────────────────────────────────────────────────

export const cancelOrder = publicProcedure.input(cancelOrderSchema).mutation(async (opts) => {
  const { id, reason } = opts.input;
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { line_items: true } });
    if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
    if (order.status === "cancelled" || order.status === "refunded")
      throw new TRPCError({ code: "BAD_REQUEST", message: "Already cancelled" });
    return await tx.order.update({
      where: { id },
      data: {
        status: "cancelled",
        notes: reason ? appendCancellationReason(order.notes, reason) : order.notes,
      },
      include: { line_items: { include: { book_variant: { include: { book: true } } } }, customer: { include: { user: true } }, publisher: true },
    });
  });
});

// ─── getOrdersNeedingShipping ─────────────────────────────────────────────────

// export const getOrdersNeedingShipping = publicProcedure
//   .input(getOrdersNeedingShippingSchema.extend({ user_id: z.string().optional() }))
//   .query(async ({ ctx, input }) => {
//     const activeUserId = input?.user_id || ctx.session?.user?.id;
//     if (!activeUserId) return [];
//     const user = await prisma.user.findUnique({ where: { id: activeUserId }, include: { claims: true, publisher: true } });
//     if (!user) return [];
//     const isSuperAdmin = user.claims.some(c => c.role_name === "super-admin" && c.active);
//     const whereClause: any = { payment_status: "captured" };
//     if (!isSuperAdmin) {
//       const publisherId = input.publisher_id || user.publisher?.id;
//       if (!publisherId) return [];
//       whereClause.publisher_id = publisherId;
//     }
//     const paidOrders = await prisma.order.findMany({
//       where: whereClause,
//       include: { line_items: { include: { book_variant: { include: { book: true } } } }, customer: { include: { user: true } }, publisher: true, deliveries: true },
//       orderBy: { created_at: "desc" },
//     });
//     return paidOrders.filter(order => {
//       const hasPhysical = order.line_items.some(item => isPhysicalFormat(item.book_variant.format.toLowerCase()));
//       if (!hasPhysical) return false;
//       const hasActive = order.deliveries.some(d => d.status !== "pending" && d.status !== "failed");
//       return !hasActive || order.deliveries.length === 0;
//     });
//   });

// ─── getDeliveriesByOrder ─────────────────────────────────────────────────────

export const getDeliveriesByOrder = publicProcedure.input(getDeliveriesByOrderSchema).query(async (opts) => {
  return await prisma.deliveryTracking.findMany({
    where: { order_id: opts.input.order_id },
    include: {
      order: { include: { customer: { include: { user: true } }, line_items: { include: { book_variant: { include: { book: true } } } } } },
      order_lineitem: { include: { book_variant: { include: { book: true } } } },
    },
    orderBy: { created_at: "desc" },
  });
});

// ─── createDeliveryTracking ───────────────────────────────────────────────────

export const createDeliveryTracking = publicProcedure.input(createDeliveryTrackingSchema).mutation(async (opts) => {
  const order = await prisma.order.findUnique({ where: { id: opts.input.order_id } });
  if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
  if (order.payment_status !== "captured") throw new TRPCError({ code: "BAD_REQUEST", message: "Order not paid" });
  const delivery = await prisma.deliveryTracking.create({
    data: {
      order_id: opts.input.order_id,
      order_lineitem_id: opts.input.order_lineitem_id !== "none" ? opts.input.order_lineitem_id : null,
      carrier: opts.input.carrier, service_level: opts.input.service_level || null,
      tracking_number: opts.input.tracking_number, tracking_url: opts.input.tracking_url || null,
      estimated_delivery_at: opts.input.estimated_delivery_at || null, status: opts.input.status,
    },
    include: { order: true, order_lineitem: { include: { book_variant: { include: { book: true } } } } },
  });
  if (opts.input.order_lineitem_id)
    await prisma.orderLineItem.update({ where: { id: opts.input.order_lineitem_id }, data: { fulfillment_status: "in_progress" } });
  if (order.status !== "fulfilled")
    await prisma.order.update({ where: { id: opts.input.order_id }, data: { status: "fulfilled" } });
  return delivery;
});

// ─── updateDeliveryTracking ───────────────────────────────────────────────────

export const updateDeliveryTracking = publicProcedure.input(updateDeliveryTrackingSchema).mutation(async (opts) => {
  const { id, ...updateData } = opts.input;
  const data: any = { ...updateData };
  if (updateData.status === "delivered") data.delivered_at = new Date();
  if (updateData.status === "in_transit" || updateData.status === "out_for_delivery") data.shipped_at = new Date();
  const updated = await prisma.deliveryTracking.update({
    where: { id }, data,
    include: { order: { include: { line_items: true } }, order_lineitem: { include: { book_variant: { include: { book: true } } } } },
  });
  if (updated.order_lineitem_id) {
    let fStatus = "in_progress";
    if (updateData.status === "delivered") fStatus = "delivered";
    else if (["in_transit", "out_for_delivery"].includes(updateData.status || "")) fStatus = "shipped";
    await prisma.orderLineItem.update({ where: { id: updated.order_lineitem_id }, data: { fulfillment_status: fStatus } });
  }
  return updated;
});

// ─── getAllOrders ─────────────────────────────────────────────────────────────


export const getAllOrders = publicProcedure
  .input(z.object({ user_id: z.string().optional() }).optional())
  .query(async ({ ctx, input }) => {
    const activeUserId = input?.user_id || ctx.session?.user?.id;
    if (!activeUserId) return [];
 
    const userCtx = await resolveUserContext(activeUserId);
    if (!userCtx.isUser && !userCtx.isAdminUser) return [];
 
    const whereClause: any = {};
 
    if (!userCtx.isSuperAdmin) {
      if (userCtx.publisher_id) {
        whereClause.publisher_id = userCtx.publisher_id;
      } else if (userCtx.author_id) {
        whereClause.line_items = {
          some: { book_variant: { book: { author_id: userCtx.author_id } } },
        };
      } else {
        // Regular customer — show only their own orders
        whereClause.customer = { user_id: activeUserId };
      }
    }
    // isSuperAdmin → empty whereClause → all orders
 
    return await prisma.order.findMany({
      where:   whereClause,
      include: {
        line_items:   { include: { book_variant: { include: { book: true } } } },
        customer:     { include: { user: true } },
        publisher:    true,
        transactions: { orderBy: { created_at: "desc" }, take: 1 },
        deliveries:   { orderBy: { created_at: "desc" } },
      },
      orderBy: { created_at: "desc" },
    });
  });
 
export const getOrdersNeedingShipping = publicProcedure
  .input(getOrdersNeedingShippingSchema.extend({ user_id: z.string().optional() }))
  .query(async ({ ctx, input }) => {
    const activeUserId = input?.user_id || ctx.session?.user?.id;
    if (!activeUserId) return [];
 
    const userCtx = await resolveUserContext(activeUserId);
    if (!userCtx.isUser && !userCtx.isAdminUser) return [];
 
    const whereClause: any = { payment_status: "captured" };
 
    if (!userCtx.isSuperAdmin) {
      const publisherId = input.publisher_id || userCtx.publisher_id;
      if (!publisherId) return [];
      whereClause.publisher_id = publisherId;
    }
 
    const paidOrders = await prisma.order.findMany({
      where:   whereClause,
      include: {
        line_items: { include: { book_variant: { include: { book: true } } } },
        customer:   { include: { user: true } },
        publisher:  true,
        deliveries: true,
      },
      orderBy: { created_at: "desc" },
    });
 
    return paidOrders.filter(order => {
      const hasPhysical = order.line_items.some(item => {
        const fmt = item.book_variant.format.toLowerCase();
        return fmt === "paperback" || fmt === "hardcover";
      });
      if (!hasPhysical) return false;
      const hasActive = order.deliveries.some(
        d => d.status !== "pending" && d.status !== "failed"
      );
      return !hasActive || order.deliveries.length === 0;
    });
  });


  export const updateLineItemFulfillment = publicProcedure
  .input(
    z.object({
      line_item_id:       z.string(),
      fulfillment_status: z.enum([
        "unfulfilled",
        "in_progress",
        "shipped",
        "delivered",
        "cancelled",
      ]),
    })
  )
  .mutation(async ({ input }) => {
    const lineItem = await prisma.orderLineItem.findUnique({
      where: { id: input.line_item_id },
    });
 
    if (!lineItem) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Order line item not found.",
      });
    }
 
    const updated = await prisma.orderLineItem.update({
      where: { id: input.line_item_id },
      data:  { fulfillment_status: input.fulfillment_status },
    });
 
    // If all physical line items on the order are now delivered,
    // auto-promote the order status to "fulfilled"
    const allLineItems = await prisma.orderLineItem.findMany({
      where: { order_id: lineItem.order_id },
      include: {
        book_variant: { select: { format: true } },
      },
    });
 
    const physicalItems = allLineItems.filter((li) =>
      ["paperback", "hardcover"].includes(li.book_variant?.format?.toLowerCase() ?? "")
    );
 
    const allDelivered =
      physicalItems.length > 0 &&
      physicalItems.every((li) => li.fulfillment_status === "delivered");
 
    if (allDelivered) {
      await prisma.order.update({
        where: { id: lineItem.order_id },
        data:  { status: "fulfilled" },
      });
    }
 
    return updated;
  });
 

// ─── getEarningsReport ────────────────────────────────────────────────────────

export const getEarningsReport = publicProcedure
  .input(z.object({ publisher_id: z.string().optional(), author_id: z.string().optional() }))
  .query(async ({ input }) => {
    const where: any = {};
    if (input.publisher_id) where.book_variant = { book: { publisher_id: input.publisher_id } };
    if (input.author_id)    where.book_variant = { book: { author_id:    input.author_id    } };
    const lineItems = await prisma.orderLineItem.findMany({
      where:  { ...where, order: { payment_status: "captured" } },
      select: { publisher_earnings: true, author_earnings: true, platform_fee: true, total_price: true },
    });
    return {
      total_sales:     lineItems.reduce((a, c) => a + c.total_price,          0),
      author_total:    lineItems.reduce((a, c) => a + (c.author_earnings    || 0), 0),
      publisher_total: lineItems.reduce((a, c) => a + (c.publisher_earnings || 0), 0),
      platform_total:  lineItems.reduce((a, c) => a + (c.platform_fee       || 0), 0),
    };
  });
